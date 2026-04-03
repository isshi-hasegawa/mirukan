import mirukanLogoUrl from "../../../assets/brand/mirukan_logo_primary_tight.png";

type Props = {
  className?: string;
};

export function BrandLogo({ className }: Props) {
  return <img src={mirukanLogoUrl} alt="みるカン" className={className} />;
}
