/** DOM order, not API object order: focus the first invalid control in the sheet. */
export function focusFirstInvalidField(
  form: HTMLFormElement | null,
  errors: Record<string, string>,
) {
  const first = Array.from(
    form?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[name]") ||
      [],
  ).find((el) => errors[el.name]);
  first?.scrollIntoView({ behavior: "smooth", block: "center" });
  first?.focus({ preventScroll: true });
}
