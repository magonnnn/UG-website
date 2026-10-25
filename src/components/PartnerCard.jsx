const PartnerCard = ({ partner, compact = false }) => (
    <article
        className={`relative isolate flex flex-col justify-between overflow-hidden bg-bg bg-cover bg-center ${compact ? "min-h-28 p-4" : "min-h-[280px] p-5 sm:min-h-[340px] sm:p-6"
            }`}
        style={{ backgroundImage: `url("${partner.logo}")` }}
    >
        <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-black/25 via-black/45 to-black/90"
        />
        <a
            href={partner.href}
            className={`font-bold leading-tight text-white drop-shadow-lg transition-colors hover:text-red-300 ${compact ? "text-xl" : "text-3xl sm:text-4xl"
                }`}
        >
            {partner.name}
        </a>
        <p className={`font-semibold text-white drop-shadow-md ${compact ? "text-xs" : "text-base sm:text-lg"}`}>
            {partner.offer}
        </p>
    </article>
);

export default PartnerCard;
