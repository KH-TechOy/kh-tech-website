import React from "react";
import { ChevronDown } from "lucide-react";
import { priceCents } from "../reportLocale";
import { money, type CatalogMaterial } from "../reportWorkModel";
import { useFormDraft } from "./useFormDraft";

export function PriceInput({
  value,
  onChange,
  optional = false,
  maximum = 100000000,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange(value: string): void;
  optional?: boolean;
  maximum?: number;
}) {
  const validate = (input: HTMLInputElement) => {
    try {
      priceCents(input.value, optional, maximum);
      input.setCustomValidity("");
    } catch (error) {
      input.setCustomValidity((error as Error).message);
    }
  };
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      lang="fi"
      value={value}
      data-money-input
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        onChange(e.target.value);
        e.currentTarget.setCustomValidity("");
      }}
      onBlur={(e) => {
        validate(e.currentTarget);
        props.onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        props.onKeyDown?.(e);
      }}
    />
  );
}
/** Editing text is local only. Commit canonical numeric values on blur, not each partial keystroke. */
export function BufferedPrice({
  uid,
  identity,
  value,
  onCommit,
  label,
  scale = 100,
  maximum = 100000000,
}: {
  uid: string;
  identity: string;
  value: number;
  onCommit(value: number): void;
  label?: string;
  scale?: number;
  maximum?: number;
}) {
  const {
    draft,
    value: buffer,
    setValue,
    hasDraft,
    status,
    readFailed,
  } = useFormDraft(uid, "price:" + identity, () => ({
    text: String(value / scale).replace(".", ","),
    base: value,
  }));
  const descriptionId = React.useId();
  const latest = React.useRef({ buffer, onCommit, hasDraft, maximum, scale });
  latest.current = { buffer, onCommit, hasDraft, maximum, scale };
  const commit = () => {
    const current = latest.current;
    if (!current.hasDraft || draft.getSnapshot().readFailed) return;
    try {
      const cents = priceCents(
        current.buffer.text,
        false,
        current.maximum * (100 / current.scale),
      )!;
      const number = (cents * current.scale) / 100;
      current.onCommit(number);
      draft.clear({
        text: String(number / current.scale).replace(".", ","),
        base: number,
      });
    } catch {
      draft.flush();
    }
  };
  const commitRef = React.useRef(commit);
  commitRef.current = commit;
  React.useEffect(() => {
    const save = () => commitRef.current();
    const hidden = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("beforeunload", save, true);
    window.addEventListener("pagehide", save, true);
    document.addEventListener("visibilitychange", hidden, true);
    return () => {
      window.removeEventListener("beforeunload", save, true);
      window.removeEventListener("pagehide", save, true);
      document.removeEventListener("visibilitychange", hidden, true);
    };
  }, []);
  const notice =
    status === "error"
      ? readFailed
        ? "Aiemman hintasyötteen lukeminen epäonnistui. Muokkaaminen pyytää vahvistuksen sen korvaamiseen."
        : "Hintasyötteen tallennus epäonnistui. Syöte säilyy muistissa."
      : status === "saved"
        ? "Hintasyöte tallennettu paikallisesti. Vahvista poistumalla kentästä."
        : "Hintasyöte kesken. Vahvista poistumalla kentästä.";
  return (
    <>
      <PriceInput
        aria-label={label}
        aria-describedby={
          hasDraft || status === "error" ? descriptionId : undefined
        }
        value={hasDraft ? buffer.text : String(value / scale).replace(".", ",")}
        maximum={(maximum * 100) / scale}
        onChange={(text) => {
          if (
            draft.getSnapshot().readFailed &&
            (!confirm(
              "Korvataanko tämän hintakentän aiempi lukukelvoton paikallinen syöte?",
            ) ||
              !draft.clear({
                text: String(value / scale).replace(".", ","),
                base: value,
              }))
          )
            return;
          setValue({ text, base: value });
        }}
        onBlur={commit}
      />
      {(hasDraft || status === "error") && (
        <small
          className="price-buffer-status"
          id={descriptionId}
          aria-hidden="true"
        >
          {notice}
        </small>
      )}
    </>
  );
}

export function MaterialPicker({
  items,
  onSelect,
}: {
  items: CatalogMaterial[];
  onSelect(item: CatalogMaterial): void;
}) {
  const [search, setSearch] = React.useState(""),
    [open, setOpen] = React.useState(false),
    [active, setActive] = React.useState(-1),
    [shown, setShown] = React.useState(12);
  const listId = React.useId(),
    input = React.useRef<HTMLInputElement>(null),
    container = React.useRef<HTMLDivElement>(null);
  const filtered = items.filter(
    (item) =>
      item.active &&
      (item.name + " " + item.code)
        .toLocaleLowerCase("fi")
        .includes(search.toLocaleLowerCase("fi")),
  );
  const visible = filtered.slice(0, shown);
  const select = (item: CatalogMaterial) => {
    onSelect(item);
    setSearch("");
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  };
  React.useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);
  return (
    <div
      className="catalog-picker"
      ref={container}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <label htmlFor={listId + "-input"}>Hae materiaalia luettelosta</label>
      <div className="catalog-search">
        <input
          id={listId + "-input"}
          ref={input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && active >= 0 ? `${listId}-${active}` : undefined
          }
          value={search}
          placeholder="Nimi tai tuotekoodi"
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setActive(-1);
            setShown(12);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (["ArrowDown", "ArrowUp"].includes(e.key)) {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                Math.max(
                  0,
                  Math.min(
                    visible.length - 1,
                    i + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (active >= 0 && visible[active]) select(visible[active]);
            }
          }}
        />
        <button
          type="button"
          className="catalog-toggle"
          aria-label="Näytä luettelomateriaalit"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpen(!open);
            setActive(-1);
            input.current?.focus();
          }}
        >
          <ChevronDown aria-hidden="true" size={22} />
        </button>
      </div>
      {open && (
        <div className="catalog-options">
          <ul id={listId} role="listbox" aria-label="Luettelomateriaalit">
            {visible.map((item, i) => (
              <li
                key={item.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className="button outline"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => select(item)}
                >
                  {item.name} · {money(item.sellingCents)} / {item.unit}
                  {item.code && <small>{item.code}</small>}
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length && (
            <p role="status">
              Ei vastaavia materiaaleja ladatussa luettelossa. Voit lisätä
              materiaalin myös käsin.
            </p>
          )}
          {filtered.length > shown && (
            <button
              type="button"
              className="button outline"
              onClick={() => setShown((n) => n + 12)}
            >
              Näytä lisää hakutuloksia
            </button>
          )}
          <p className="work-help">
            Haku kattaa ladatut materiaalit. Lisää luettelon sivuja voi ladata
            erillisestä painikkeesta. Myös käsin lisääminen säilyy.
          </p>
        </div>
      )}
    </div>
  );
}
