import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Home = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    return (
        <section className="min-w-0">
            <section aria-labelledby="articles-heading">
                <h1 id="articles-heading" className="mb-5 text-2xl font-bold text-white sm:text-3xl">
                    Najnowsze artykuły
                </h1>
                {loading ? (
                    <p className="text-sm text-gray-400">Ładowanie artykułów...</p>
                ) : error ? (
                    <p role="alert" className="text-sm text-red-300">{error}</p>
                ) : articles.length === 0 ? (
                    <p className="text-sm text-gray-400">Brak artykułów.</p>
                ) : (
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        {articles.map((article) => (
                            <Link
                                to={`/article/${article.id}`}
                                key={article.id}
                                className="group min-w-0 overflow-hidden border border-white/10 transition-colors hover:border-white/20"
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
                )}
            </section>
        </section>
    );
};

export default Home;
