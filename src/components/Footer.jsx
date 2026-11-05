import { Link } from "react-router-dom";
import ugLogo from "../assets/logo.png";

const Footer = () => {
    return (
        <footer className="w-full border-t border-border bg-bg text-white">
            <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-10">
                <div className="flex min-w-0 flex-col items-start gap-3">
                    <Link to="/" className="flex shrink-0 items-center">
                        <img src={ugLogo} alt="PODZIEMIE CS2" className="h-10 w-10 invert object-contain" />
                    </Link>
                    <p className="max-w-xs text-left text-xs text-gray-400">
                        PODZIEMIE CS2 to społeczność zrzeszająca graczy Counter Strike 2
                    </p>
                </div>
                <div className="flex flex-col items-start gap-2 text-left">
                    <h3 className="mb-1 font-bold text-lg">PODZIEMIE</h3>
                    <Link to="/contact" className="text-gray-400 transition-colors hover:text-white">
                        Kontakt
                    </Link>
                    <Link to="/partners" className="text-gray-400 transition-colors hover:text-white">
                        Partnerzy
                    </Link>
                </div>
                <div className="flex flex-col items-start gap-2 text-left">
                    <h3 className="mb-1 font-bold text-lg">DOKUMENTY</h3>
                    <Link to="/privacy-policy" className="text-gray-400 transition-colors hover:text-white">
                        Polityka prywatności
                    </Link>
                </div>
                <div className="flex flex-col items-start gap-2 text-left">
                    <h3 className="mb-1 font-bold text-lg">SOCIAL MEDIA</h3>
                    <a href="https://x.com/PODZIEMIECS2" target="_blank" rel="noopener noreferrer" className="text-gray-400 transition-colors hover:text-white">
                        X
                    </a>
                    <a href="https://discord.gg/5Aa8bCPhg" target="_blank" rel="noopener noreferrer" className="text-gray-400 transition-colors hover:text-white">
                        Discord
                    </a>
                </div>
            </div>
            <div className="border-t border-border">
                <div className="mx-auto w-full max-w-[1600px] px-4 py-4 text-center sm:px-6 sm:text-left">
                    <p className="text-xs text-gray-500">
                        &copy; {new Date().getFullYear()} PODZIEMIE CS2. Wszystkie prawa zastrzeżone.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer;