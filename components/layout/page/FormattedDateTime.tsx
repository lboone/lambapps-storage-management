import { cn, formatDateTime } from "@/lib/utils";

type Props = {
  date: string;
  className?: string;
};
const FormattedDateTime = ({ date, className }: Props) => {
  return (
    <div className={cn("body-1 text-light-200", className)}>
      {formatDateTime(date)}
    </div>
  );
};
export default FormattedDateTime;
