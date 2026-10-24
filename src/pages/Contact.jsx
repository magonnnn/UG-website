import admins from "../data/admins";
import NoiseOverlay from "../components/NoiseOverlay";
import discordIcon from "../assets/discord.webp";

const Contact = () => {
    const gradients = {
        "black-amber-400": "from-black via-black/90 to-amber-400/70",
        "black-red-700": "from-black via-black/90 to-red-700/70",
        "black-purple-900": "from-black via-black/90 to-purple-900/70",
        "black-green-500": "from-black via-black/90 to-green-500/70",
        "black-yellow-200": "from-black via-black/90 to-yellow-200/70",
    };

    return (
        <section className="grid min-h-[65vh] grid-cols-1 gap-4" aria-label="Staff contact list">
            {admins.map((admin) => {
                const gradientKey = `${admin.fromColor}-${admin.toColor}`;

                return (
                    <div
                        key={admin.discord}
                        className={`relative isolate flex w-full flex-row items-center justify-between overflow-hidden bg-linear-to-br p-4 ${gradients[gradientKey] ?? "from-black via-black/90 to-gray-800"}`}
                    >
                        <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
                        <NoiseOverlay />

                        <div className="relative z-10">
                            <h1 className="text-3xl font-bold text-white">
                                {admin.name}
                            </h1>
                            <p className="tracking-[0.18em] text-xs text-white/60 uppercase">
                                {admin.role}
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/80">
                            <img src={discordIcon} alt="discord icon" className="h-6 w-6" />
                            <span>{admin.discord}</span>
                        </div>
                    </div>
                );
            })}
        </section>
    );
};

export default Contact;