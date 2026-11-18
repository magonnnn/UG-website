import PartnerCard from "../components/PartnerCard";
import partners from "../data/partners";

const Partners = () => {
    return (
        <section className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {partners.map((partner) => (
                    <PartnerCard key={partner.name} partner={partner} />
                ))}
            </div>
        </section>
    )
}

export default Partners