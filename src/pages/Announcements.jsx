import { useEffect, useState } from "react";
import announcementsIcon from "../assets/announcements.svg";
import { supabase } from "../lib/supabaseClient";

const MAX_ANNOUNCEMENT_CONTENT_LENGTH = 250;

const formatDate = (date) => {
    if (!date) return "Nieznana data";

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
        ? "Nieznana data"
        : parsedDate.toLocaleString("pl-PL", {
            dateStyle: "medium",
            timeStyle: "short",
        });
};

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [submissionNotice, setSubmissionNotice] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let active = true;
        let authEventCount = 0;

        const fetchAnnouncements = async () => {
            const { data, error: queryError } = await supabase
                .from("announcements")
                .select("*")
                .eq("is_approved", true)
                .order("created_at", { ascending: false });

            if (!active) return;

            if (queryError) {
                console.error("Error loading announcements:", queryError.message);
                setError("Nie udało się załadować ogłoszeń.");
            } else {
                setAnnouncements(data ?? []);
            }

            setLoading(false);
        };

        void fetchAnnouncements();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            authEventCount += 1;
            setUser(session?.user ?? null);
            setAuthReady(true);
        });

        supabase.auth.getSession().then(({ data, error: sessionError }) => {
            if (!active || authEventCount > 0) return;

            if (sessionError) {
                console.error("Error getting announcement author session:", sessionError.message);
            }

            setUser(data?.session?.user ?? null);
            setAuthReady(true);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    const addAnnouncement = async (event) => {
        event.preventDefault();

        const announcementTitle = title.trim();
        const announcementContent = content.trim();

        if (!announcementTitle || !announcementContent) {
            setFormError("Wypełnij tytuł i treść ogłoszenia.");
            return;
        }

        if (announcementContent.length > MAX_ANNOUNCEMENT_CONTENT_LENGTH) {
            setFormError(`Treść może mieć maksymalnie ${MAX_ANNOUNCEMENT_CONTENT_LENGTH} znaków.`);
            return;
        }

        setSubmitting(true);
        setFormError("");
        setSubmissionNotice("");

        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
            console.error(
                "Error checking announcement author session:",
                authError?.message ?? "No authenticated user"
            );
            setFormError("Zaloguj się ponownie, aby dodać ogłoszenie.");
            setSubmitting(false);
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("name")
            .eq("id", authData.user.id)
            .maybeSingle();

        if (profileError || !profile?.name?.trim()) {
            console.error(
                "Error loading announcement author profile:",
                profileError?.message ?? "No profile name found"
            );
            setFormError("Nie udało się odczytać nazwy z profilu. Spróbuj zalogować się ponownie.");
            setSubmitting(false);
            return;
        }

        const { error: insertError } = await supabase
            .from("announcements")
            .insert({
                title: announcementTitle,
                content: announcementContent,
                added_by: authData.user.id,
                added_by_username: profile.name.trim(),
            });

        if (insertError) {
            console.error("Error adding announcement:", insertError.message);
            setFormError("Nie udało się dodać ogłoszenia. Spróbuj ponownie.");
            setSubmitting(false);
            return;
        }

        setTitle("");
        setContent("");
        setSubmissionNotice("Ogłoszenie zostało wysłane do akceptacji administratora.");
        setSubmitting(false);
    };

    return (
        <section className="min-w-0">
            <header className="mb-5 flex items-center gap-3">
                <img
                    src={announcementsIcon}
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 invert opacity-70"
                />
                <h1 className="text-2xl font-bold text-white sm:text-3xl">Ogłoszenia</h1>
            </header>

            {authReady && (user ? (
                <form
                    onSubmit={addAnnouncement}
                    className="mb-6 space-y-3 border border-white/10 bg-bg p-4"
                >
                    <h2 className="text-lg font-bold text-white">Dodaj ogłoszenie</h2>
                    <label className="block space-y-1 text-sm text-gray-300">
                        <span>Tytuł</span>
                        <input
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            maxLength={150}
                            required
                            className="mb-4 mt-2 w-full min-w-0 border p-2.5 text-white"
                        />
                    </label>
                    <label className="block space-y-1 text-sm text-gray-300">
                        <span>Treść</span>
                        <textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            rows={4}
                            maxLength={MAX_ANNOUNCEMENT_CONTENT_LENGTH}
                            required
                            className="mb-4 mt-2 w-full min-w-0 border p-2.5 text-white"
                        />
                        <span className="block text-right text-xs text-gray-500">
                            {content.length}/{MAX_ANNOUNCEMENT_CONTENT_LENGTH}
                        </span>
                    </label>
                    {formError && (
                        <p role="alert" className="text-sm text-red-300">{formError}</p>
                    )}
                    {submissionNotice && (
                        <p role="status" className="text-sm text-green-300">{submissionNotice}</p>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-md bg-success px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-110 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Dodawanie..." : "Dodaj ogłoszenie"}
                    </button>
                </form>
            ) : (
                <p className="mb-6 text-sm text-gray-400">
                    Zaloguj się, aby dodać ogłoszenie.
                </p>
            ))}

            {loading ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Ładowanie ogłoszeń...</p>
            ) : error ? (
                <p role="status" className="px-4 py-8 text-center text-sm text-red-300">{error}</p>
            ) : announcements.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Brak ogłoszeń.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                    {announcements.map((announcement) => (
                        <li key={announcement.id} className="min-w-0">
                            <article className="h-full min-w-0 overflow-hidden border border-white/10 bg-bg">
                                <div className="border-b border-white/10 p-4">
                                    <h2 className="break-words text-lg font-bold text-white">
                                        {announcement.title}
                                    </h2>
                                    <time
                                        dateTime={announcement.created_at}
                                        className="mt-1 block text-xs text-gray-400"
                                    >
                                        {formatDate(announcement.created_at)}
                                    </time>
                                    <p className="mt-1 text-xs text-gray-400">
                                        Dodane przez: {announcement.added_by_username || "Nieznany użytkownik"}
                                    </p>
                                </div>
                                {announcement.content && (
                                    <p className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] px-4 py-3 text-sm text-gray-300">
                                        {announcement.content}
                                    </p>
                                )}
                            </article>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default Announcements;
