const Footer = () => {
    return (
        <footer className="w-full bg-bg text-white">
            <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-3 px-4 py-5 text-center sm:flex-row sm:text-left">
                <p className="text-xs text-gray-500">
                    &copy; {new Date().getFullYear()} PODZIEMIE CS2. Wszystkie prawa zastrzeżone.
                </p>
                <div className="flex items-center gap-5 text-sm font-semibold">
                    <a href="https://discord.gg/5Aa8bCPhg" target="_blank" rel="noopener noreferrer" className="text-gray-400 transition-colors hover:text-white">
                        Discord
                    </a>
                    <a href="https://x.com/PODZIEMIECS2" target="_blank" rel="noopener noreferrer" className="text-gray-400 transition-colors hover:text-white">
                        X
                    </a>
                </div>
            </div>
        </footer>
    )
}

export default Footer;