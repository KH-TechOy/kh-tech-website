import React from "react";
import type { User } from "firebase/auth";
import type { ReportPhoto } from "../reportModel";
import { reportRequest, reportError } from "./api";
import { sha256, archiveLabel, type ArchiveStatus } from "../reportArchive";
async function compressed(data: string, max = 1400, quality = 0.65) {
  const image = new Image();
  image.src = data;
  await image.decode();
  if (image.naturalWidth * image.naturalHeight > 40000000)
    throw new Error(
      "Kuva on liian suuri käsiteltäväksi. Pienennä sitä ensin laitteellasi.",
    );
  const ratio = Math.min(
      1,
      max / Math.max(image.naturalWidth, image.naturalHeight),
    ),
    canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("photo_compression"))),
      "image/jpeg",
      quality,
    ),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return {
    base64: btoa(binary),
    manifest: {
      sha256: await sha256(bytes),
      bytes: bytes.length,
      width: canvas.width,
      height: canvas.height,
      mime: "image/jpeg",
    },
  };
}
export default function PhotoDelivery({
  user,
  id,
  photos,
  ready,
  append,
}: {
  user: User;
  id: string;
  photos: ReportPhoto[];
  ready: boolean;
  append(photos: ReportPhoto[]): void;
}) {
  const [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState(""),
    [status, setStatus] = React.useState<ArchiveStatus | null>(null),
    running = React.useRef(false);
  const [category, setCategory] = React.useState("after");
  const [prepared, setPrepared] = React.useState<ReportPhoto[]>([]);
  const check = async () => {
    const r = await reportRequest<{
      status: ArchiveStatus | null;
      error?: string;
    }>(user, "/archive", { action: "photoStatus", id });
    setStatus(r.status);
    if (r.error) setMessage(reportError({ code: r.error }));
    return r.status;
  };
  return (
    <section className="photo-delivery">
      <h3>Erillinen kuvasähköposti</h3>
      <p>
        Kuvat ovat vain tässä välilehdessä. Hyväksytty tekstiraportti ei
        edellytä kuvia. Kuvien sähköpostitus on erillinen toimitus.
      </p>
      {!photos.length && <p>Ei paikallisia kuvia tällä laitteella.</p>}
      <label>
        Kuvan vaihe
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="before">Ennen työtä</option>
          <option value="during">Työn aikana</option>
          <option value="after">Työn jälkeen</option>
        </select>
      </label>
      <label>
        Lisää paikallisia toimituskuvia
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || photos.length >= 6}
          onChange={async (e) => {
            const selected = Array.from(e.target.files || []).slice(
              0,
              6 - photos.length,
            );
            e.target.value = "";
            setBusy(true);
            setMessage("");
            try {
              const added: ReportPhoto[] = [];
              for (const file of selected) {
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 12000000
                )
                  throw new Error(
                    "Valitse JPEG-, PNG- tai WebP-kuva, enintään 12 Mt.",
                  );
                const raw = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                const image = await compressed(raw);
                added.push({
                  id: crypto.randomUUID(),
                  data: "data:image/jpeg;base64," + image.base64,
                  category,
                });
              }
              append(added);
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Kuvan käsittely epäonnistui.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div className="work-actions">
        <button
          type="button"
          className="button outline"
          disabled={busy || !photos.length || !ready}
          onClick={async () => {
            if (running.current) return;
            running.current = true;
            setBusy(true);
            setMessage("");
            try {
              let images: Awaited<ReturnType<typeof compressed>>[] = [];
              for (const p of photos) images.push(await compressed(p.data));
              if (images.reduce((n, p) => n + p.manifest.bytes, 0) > 2000000) {
                images = [];
                for (const p of photos)
                  images.push(await compressed(p.data, 1000, 0.5));
              }
              if (
                images.some((p) => p.manifest.bytes > 1200000) ||
                images.reduce((n, p) => n + p.manifest.bytes, 0) > 2000000
              )
                throw new Error(
                  "Kuvat ylittävät 2 Mt:n toimitusrajan. Lataa kuvat ja toimita ne erillisinä viesteinä käsin.",
                );
              const permit = await reportRequest<{
                relayUrl: string;
                packet: unknown;
              }>(user, "/archive", {
                action: "photoPermit",
                id,
                manifest: images.map((p, i) => ({
                  ...p.manifest,
                  category: photos[i].category,
                })),
              });
              setPrepared(
                images.map((image, i) => ({
                  ...photos[i],
                  data: "data:image/jpeg;base64," + image.base64,
                })),
              );
              setStatus("ARCHIVE_SENDING");
              // Apps Script cannot supply arbitrary CORS headers. Opaque HTTP success is never delivery proof.
              await fetch(permit.relayUrl, {
                method: "POST",
                mode: "no-cors",
                credentials: "omit",
                referrerPolicy: "no-referrer",
                headers: { "Content-Type": "text/plain;charset=UTF-8" },
                body: JSON.stringify({
                  ...(permit.packet as object),
                  photos: images.map((p) => p.base64),
                }),
              }).catch(() => {});
              await check();
            } catch (e) {
              setMessage(
                e instanceof Error && !(e as any).code
                  ? e.message
                  : reportError(e),
              );
            } finally {
              setBusy(false);
              running.current = false;
            }
          }}
        >
          Lähetä paikalliset työkuvat
        </button>
        <button
          type="button"
          className="button outline"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void check()
              .catch((e) => setMessage(reportError(e)))
              .finally(() => setBusy(false));
          }}
        >
          Tarkista kuvalähetyksen tila
        </button>
      </div>
      {status && <p role="status">{archiveLabel[status]} · Kuvat</p>}
      {message && <p role="alert">{message}</p>}
      {!!prepared.length && (
        <div className="prepared-photo-files">
          <p>
            Valmistellut toimitusversiot ovat samat tavut kuin kuvalähetyksessä.
            Tallenna ne palautettavaan arkistoon ennen sivun päivitystä tai
            välilehden sulkemista, jos vastaanotto on epäselvä. Näitä
            lähetysversioita ei tallenneta pilveen tai selainluonnokseen.
          </p>
          <div className="work-actions">
            {prepared.map((p, i) => (
              <a
                key={p.id}
                href={p.data}
                download={
                  id + "_toimitus_" + p.category + "_" + (i + 1) + ".jpg"
                }
                className="button outline"
              >
                Lataa toimitusversio {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}
      <p>
        Jos palvelu ei ole käytössä tai kuvat ovat liian suuria, lataa ne ja
        lähetä käsin yrityksen sovittuun arkisto-osoitteeseen. Käytä viestin
        aiheessa raporttitunnusta {id}. Älä uusi epäselvää automaattista
        lähetystä.
      </p>
      <div className="work-actions">
        {photos.map((p, i) => (
          <a
            key={p.id}
            href={p.data}
            download={id + "_" + p.category + "_" + (i + 1) + ".jpg"}
            className="button outline"
          >
            Lataa kuva {i + 1}
          </a>
        ))}
      </div>
    </section>
  );
}
