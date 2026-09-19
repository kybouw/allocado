import { AlertTriangle, CalendarClock, Check } from "lucide-react";

/**
 * Bond duration read against the goal's time horizon.
 *
 * Duration in years means nothing on its own — it only becomes a decision once
 * you hold it against the date you need the money. Roughly: if a rate shock takes
 * longer to wash out than you have, you are carrying risk the calendar cannot absorb.
 */
export function HorizonNote({
  years,
  duration,
}: {
  years: number | null;
  duration: number | null;
}) {
  if (years == null) {
    return (
      <Note tone="neutral" icon={<CalendarClock className="size-4" />} title="No target date set">
        Give this goal a date and Allocado can tell you whether the risk you are holding has time to
        recover before you need the money.
      </Note>
    );
  }

  const yearsLabel = years < 1 ? "less than a year" : `about ${Math.round(years)} years`;

  if (duration == null) {
    return (
      <Note
        tone="neutral"
        icon={<CalendarClock className="size-4" />}
        title={`You have ${yearsLabel}`}
      >
        No bond holdings carry a duration yet, so there is nothing to check against that date.
      </Note>
    );
  }

  const tooLong = duration > years;

  return (
    <Note
      tone={tooLong ? "warn" : "ok"}
      icon={tooLong ? <AlertTriangle className="size-4" /> : <Check className="size-4" />}
      title={
        tooLong ? "Your bonds are longer than your horizon" : "Your bonds fit inside your horizon"
      }
    >
      These bonds react to interest rates over about {duration.toFixed(1)}{" "}
      {duration === 1 ? "year" : "years"}, and you need this money in {yearsLabel}.{" "}
      {tooLong
        ? "A jump in rates could still be working its way out when you go to spend it. Shorter-duration bonds would trade some yield for that certainty."
        : "A rate move has room to wash out before you spend it."}
    </Note>
  );
}

function Note({
  tone,
  icon,
  title,
  children,
}: {
  tone: "ok" | "warn" | "neutral";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    ok: "bg-avocado-100 text-avocado-800",
    warn: "bg-amber-50 text-pit",
    neutral: "bg-avocado-50 text-avocado-700",
  }[tone];

  return (
    <div className={`flex items-start gap-3 rounded-lg px-4 py-3.5 ${styles}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm leading-relaxed">{children}</span>
      </div>
    </div>
  );
}
