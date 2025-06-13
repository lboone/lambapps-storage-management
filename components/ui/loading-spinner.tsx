import Image from "next/image";

type Props = {
  isLoading: boolean;
};
const LoadingSpinner = ({ isLoading }: Props) => {
  if (!isLoading) return null;
  return (
    <Image
      src="/assets/icons/loader.svg"
      alt="loader"
      width={24}
      height={24}
      className="ml-2 animate-spin"
      priority
    />
  );
};
export default LoadingSpinner;
