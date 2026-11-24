import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import cp from "../assets/clutchpoint.png";
import fragujemy from "../assets/fragujemy-baner.png";
import clanarea from "../assets/clanarea-baner.png";
import axide from "../assets/axide.png";
import bte from "../assets/bte-baner.png";

const ARTICLE_BATCH_SIZE = 4;
const BANNERS = [
    {
        name: "clutchpoint",
        link: "https://www.clutchpoint-cp.com/",
        banner: cp,
        num: 1,
    },
    {
        name: "fragujemy",
        link: "https://www.fragujemy.com/",
        banner: fragujemy,
        num: 2,
    },
    {
        name: "clanarea",
        link: "https://clanarea.com/",
        banner: clanarea,
        num: 3,
    },
    {
        name: "Axide",
        link: "https://axide.pl/",
        banner: axide,
        num: 4,
    },
    {
        name: "BTE Esport",
        link: "https://bialskiturniej.com/",
        banner: bte,
        num: 5,
    }
]

const Home = () => {
    const [articles, setArticles] = useState([]);
    const [visibleArticleCount, setVisibleArticleCount] = useState(ARTICLE_BATCH_SIZE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [bannerNum, setBannerNum] = useState(1);

    useEffect(() => {
        const loadArticles = async () => {
            const { data, error: loadError } = await supabase
                .from("articles")
                .select("id, title, author, cover_image, created_at")
                .order("created_at", { ascending: false });

            if (loadError) {
                console.error("Error loading articles:", loadError.message);
                setError("Nie udało się załadować artykułów.");
                setLoading(false);
                return;
            }

            setArticles(data ?? []);
            setLoading(false);
        };

        void loadArticles();
    }, []);

    const getCoverUrl = (coverImage) =>
        supabase.storage.from("articles").getPublicUrl(coverImage).data.publicUrl;

    useEffect(() => {
        const interval = setInterval(() => {
            setBannerNum(prev => {
                if (prev < BANNERS.length) {
                    return prev + 1;
                }
                return 1;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="min-w-0">
            <div className="relative hidden md:block">
                {BANNERS.map((banner) => (
                    <a
                        key={banner.num}
                        href={banner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`relative ${bannerNum === banner.num ? "block" : "hidden"}`}
                    >
                        <img
                            src={banner.banner}
                            alt={banner.name}
                            className="mb-4 h-auto w-full border border-white/10 hover:opacity-70 transition-all"
                        />
                    </a>
                ))}
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                    {BANNERS.map((banner) => (
                        <button
                            key={banner.num}
                            type="button"
                            aria-label={`Pokaż baner ${banner.name}`}
                            aria-pressed={bannerNum === banner.num}
                            onClick={() => setBannerNum(banner.num)}
                            className={`aspect-square h-3 rounded-full border border-white/70 transition-all hover:bg-white ${bannerNum === banner.num ? "w-6 bg-white" : "w-3 bg-white/40"}`}
                        />
                    ))}
                </div>
            </div>
            <section aria-labelledby="articles-heading">
                {loading ? (
                    <p className="text-sm text-gray-400">Ładowanie artykułów...</p>
                ) : error ? (
                    <p role="alert" className="text-sm text-red-300">{error}</p>
                ) : articles.length === 0 ? (
                    <p className="text-sm text-gray-400">Brak artykułów.</p>
                ) : (
                    <>
                        <div
                            id="home-articles-list"
                            className="grid min-w-0 gap-4 sm:grid-cols-2"
                        >
                            {articles.map((article, index) => (
                                <Link
                                    to={`/article/${article.id}`}
                                    key={article.id}
                                    className={`group min-w-0 overflow-hidden border border-white/10 bg-bg transition-colors hover:border-white/20 ${index >= visibleArticleCount ? "hidden" : ""}`}
                                >
                                    <img
                                        src={getCoverUrl(article.cover_image)}
                                        alt=""
                                        className="aspect-video w-full object-cover"
                                    />
                                    <div className="p-4">
                                        <h3 className="text-lg font-bold text-white group-hover:text-red-300">
                                            {article.title}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-400">
                                            Autor: {article.author}
                                        </p>
                                        {article.created_at && (
                                            <time
                                                dateTime={article.created_at}
                                                className="mt-1 block text-xs text-gray-500"
                                            >
                                                {new Date(article.created_at).toLocaleDateString("pl-PL")}
                                            </time>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {visibleArticleCount < articles.length && (
                            <button
                                type="button"
                                aria-controls="home-articles-list"
                                onClick={() => {
                                    setVisibleArticleCount((count) => count + ARTICLE_BATCH_SIZE);
                                }}
                                className="mt-4 w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white hover:cursor-pointer"
                            >
                                Pokaż więcej artykułów
                            </button>
                        )}
                    </>
                )}
            </section>
        </section>
    );
};

export default Home;
