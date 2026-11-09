import admins from "../data/admins";
import discordIcon from "../assets/discord.webp";

const Contact = () => {
    return (
        <section className="grid min-h-[65vh] grid-cols-1 gap-4" aria-label="Staff contact list">
            {admins.map((admin) => {

                return (
                    <div
                        key={admin.discord}
                        className="relative isolate flex w-full flex-row items-center justify-between overflow-hidden p-4 text-white transition-colors hover:bg-white/[0.03] sm:p-6 border border-white/10 transition-colors hover:border-white/20"
                    >

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