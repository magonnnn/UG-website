import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import pageOut from "../assets/page-out.svg";

const Article = () => {
    const { id } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        const loadArticle = async () => {
            setLoading(true);
            setError("");

            const { data, error: loadError } = await supabase
                .from("articles")
                .select("id, title, author, cover_image, content, created_at")
                .eq("id", id)
                .maybeSingle();

            if (!mounted) return;

            if (loadError) {
                console.error("Error loading article:", loadError.message);
                setError("Nie udało się załadować artykułu.");
            } else {
                setArticle(data);
            }

            setLoading(false);
        };

        void loadArticle();

        return () => {
            mounted = false;
        };
    }, [id]);

    if (loading) {
        return <p className="text-sm text-gray-400">Ładowanie artykułu...</p>;
    }

    if (error) {
        return <p role="alert" className="text-sm text-red-300">{error}</p>;
    }

    if (!article) {
        return (
            <section className="min-w-0">
                <p className="text-sm text-gray-400">Nie znaleziono artykułu.</p>
                <Link to="/" className="mt-4 inline-block text-sm text-red-300 hover:text-red-200">
                    Wróć do strony głównej
                </Link>
            </section>
        );
    }

    const coverUrl = supabase.storage
        .from("articles")
        .getPublicUrl(article.cover_image).data.publicUrl;

    return (
        <article className="mx-auto min-w-0 max-w-4xl">
            <Link
                to="/"
                className="mb-5 flex items-center gap-2 text-sm text-red-300 hover:text-red-200"
            >
                <img
                    src={pageOut}
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4 invert opacity-60"
                />
                Wróć do artykułów
            </Link>
            <header className="mb-6 border-b border-white/10 pb-5">
                <h1 className="text-2xl font-bold text-white sm:text-4xl">{article.title}</h1>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                    <span>Autor: {article.author}</span>
                    {article.created_at && (
                        <time dateTime={article.created_at}>
                            {new Date(article.created_at).toLocaleDateString("pl-PL")}
                        </time>
                    )}
                </div>
            </header>
            <img
                src={coverUrl}
                alt=""
                className="mb-6 aspect-video w-full object-cover"
            />
            <div className="whitespace-pre-wrap break-words text-base leading-8 text-gray-200">
                {article.content}
            </div>
        </article>
    );
};

export default Article;
