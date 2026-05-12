export function FinalCta() {
  return (
    <section className="max-w-[1280px] mx-auto px-8">
      <div
        className="border-t py-32 text-center relative"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <span
          aria-hidden
          className="absolute -top-px left-1/2 -translate-x-1/2 w-24 h-px"
          style={{ background: "var(--color-accent)" }}
        />
        <span className="overline overline-accent">Exhibit G — Closing</span>
        <h2 className="display mt-12 mx-auto max-w-[900px]">
          File your <em>own</em> case.
        </h2>
        <p className="lede mt-8 mx-auto">
          Take the playground further.
          <br />
          <em>Read the guide, or fork it in Studio.</em>
        </p>
        <div className="flex justify-center gap-12 mt-12 flex-wrap">
          <a
            href="https://studio.genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Fork in GenLayer Studio →
          </a>
          <a href="#field-guide" className="btn-ghost">
            Read the field guide
          </a>
        </div>
      </div>
    </section>
  );
}
