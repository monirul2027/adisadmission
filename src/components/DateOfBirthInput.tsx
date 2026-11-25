import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePastedDate, type DateParts } from "@/lib/date-entry";

export default function DateOfBirthInput({ value, onChange }: { value: DateParts; onChange: (value: DateParts) => void }) {
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const fields = [
    { key: "day", label: "Day", placeholder: "DD", length: 2, ref: dayRef, next: monthRef, previous: null },
    { key: "month", label: "Month", placeholder: "MM", length: 2, ref: monthRef, next: yearRef, previous: dayRef },
    { key: "year", label: "Year", placeholder: "YYYY", length: 4, ref: yearRef, next: null, previous: monthRef },
  ] as const;

  return (
    <div className="min-w-0 space-y-2">
      <Label id="dob-label" htmlFor="dob-day">Date of Birth <span className="text-destructive">*</span></Label>
      <div role="group" aria-labelledby="dob-label" className="grid w-full min-w-0 grid-cols-[1fr_auto_1fr_auto_2fr] items-center gap-2">
        {fields.map((field, index) => (
          <div key={field.key} className={index === 2 ? "min-w-0" : "contents"}>
            <Input
              ref={field.ref}
              id={`dob-${field.key}`}
              aria-label={`Date of Birth ${field.label}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={field.placeholder}
              maxLength={field.length}
              required
              value={value[field.key]}
              className="w-full min-w-0 text-center"
              onChange={(event) => {
                const raw = event.target.value;
                onChange({ ...value, [field.key]: raw });
                if (!composing.current && /^\d{2}$/.test(raw) && field.next) {
                  field.next.current?.focus();
                }
              }}
              onCompositionStart={() => { composing.current = true; }}
              onCompositionEnd={(event) => {
                composing.current = false;
                if (/^\d{2}$/.test(event.currentTarget.value)) field.next?.current?.focus();
              }}
              onKeyDown={(event) => {
                if (!composing.current && !event.nativeEvent.isComposing && event.key === "Backspace" && !event.currentTarget.value) {
                  field.previous?.current?.focus();
                }
              }}
              onPaste={(event) => {
                const parts = parsePastedDate(event.clipboardData.getData("text"));
                if (!parts) return;
                event.preventDefault();
                onChange(parts);
                yearRef.current?.focus();
              }}
            />
            {index < 2 && <span aria-hidden="true" className="text-muted-foreground">/</span>}
          </div>
        ))}
      </div>
    </div>
  );
}