import { mkdirSync, writeFileSync } from "node:fs";
export default class WebsiteReporter {
  tests = [];
  onBegin(config) {
    this.projects = config.projects.map((project) => ({
      name: project.name,
      viewport: project.use.viewport,
      touch: !!project.use.hasTouch,
    }));
  }
  onTestEnd(test, result) {
    this.tests.push({
      project: test.parent.project()?.name,
      title: test.title,
      status: result.status,
      durationMs: result.duration,
      ...(result.error ? { error: result.error.message } : {}),
    });
  }
  onEnd(result) {
    const base = process.env.VITE_BASE_PATH || "/",
      production = process.env.WEBSITE_PRODUCTION === "1",
      name = production ? (base === "/" ? "root" : "pages") : "development";
    mkdirSync("docs/website2-checks", { recursive: true });
    const suffix = process.env.WEBSITE_FOCUSED === "1" ? "-focused" : "";
    writeFileSync(
      "docs/website2-checks/" + name + suffix + "-browser.json",
      JSON.stringify(
        {
          base,
          production,
          environment:
            "Headless Chromium; mobile viewport and touch emulation on the development computer, not physical phones.",
          status: result.status,
          durationMs: result.duration,
          projects: this.projects,
          tests: this.tests,
        },
        null,
        2,
      ),
    );
  }
}
