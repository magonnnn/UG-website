import { useEffect, useRef, useState } from "react";
import CalendarTile from "../components/CalendarTile";
import { supabase } from "../lib/supabaseClient";
import removeIcon from "../assets/remove.svg";

const Calendar = () => {
    const [error, setError] = useState("");
    const [rewards, setRewards] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [todayOpened, setTodayOpened] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimedReward, setClaimedReward] = useState(null);
    const [userRewards, setUserRewards] = useState(null);
    const rewardModalRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        async function fetchCurrentUser() {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError) {
                    throw authError;
                }

                if (!mounted) return;
                setCurrentUser(user);

                if (!user) {
                    setTodayOpened(false);
                    return;
                }

                const { data, error: profileError } = await supabase
                    .from("users")
                    .select("today_opened")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profileError) {
                    throw profileError;
                }

                setTodayOpened(data?.today_opened ?? false);
            } catch (fetchError) {
                if (mounted) {
                    setError(fetchError.message ?? "Nie udało się pobrać danych użytkownika.");
                }
            }
        }

        void fetchCurrentUser();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        async function fetchRewards() {
            try {
                const { data, error } = await supabase
                    .from("calendar_rewards")
                    .select("*")
                    .is("awarded_to", null);

                if (error) {
                    throw error;
                }

                setRewards(data ?? []);
            } catch (fetchError) {
                setError(fetchError.message ?? "Nie udało się pobrać nagród.");
            }
        }

        void fetchRewards();
    }, []);

    useEffect(() => {
        let mounted = true;

        async function fetchUserRewards() {
            if (!currentUser) {
                setUserRewards([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("calendar_rewards")
                    .select("*")
                    .eq("awarded_to", currentUser.id);

                if (error) {
                    throw error;
                }

                if (mounted) {
                    setUserRewards(data ?? []);
                }
            } catch (fetchError) {
                if (mounted) {
                    setError(fetchError.message ?? "Nie udało się pobrać nagród.");
                }
            }
        }

        void fetchUserRewards();

        return () => {
            mounted = false;
        };
    }, [currentUser]);

    const generateReward = async () => {
        if (!currentUser || todayOpened || isClaiming) return;

        setIsClaiming(true);
        setError("");

        try {
            const { data: rewardId, error } = await supabase.rpc("claim_calendar_reward");

            if (error) {
                throw error;
            }

            if (!rewardId) {
                throw new Error("Nie udało się odebrać nagrody.");
            }

            const claimedReward = rewards.find((reward) => String(reward.id) === rewardId);
            setTodayOpened(true);
            setRewards((available) => available.filter((reward) => String(reward.id) !== rewardId));
            if (claimedReward) {
                setUserRewards((owned) => [
                    ...(owned ?? []).filter((reward) => String(reward.id) !== rewardId),
                    { ...claimedReward, awarded_to: currentUser.id },
                ]);
            }
            setClaimedReward(claimedReward ?? {
                description: "Odebrano dzisiejszą nagrodę.",
            });
            rewardModalRef.current?.showModal();
        } catch (claimError) {
            setError(claimError.message ?? "Nie udało się odebrać nagrody.");
        } finally {
            setIsClaiming(false);
        }
    };

    const currentDay = Number(new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Warsaw",
        day: "numeric",
    }).format(new Date()));
    const days = [];
    for (let i = 0; i < 30; i++) {
        days.push(i + 1);
    }
    return (
        <section>
            <dialog
                ref={rewardModalRef}
                aria-labelledby="reward-modal-title"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        rewardModalRef.current?.close();
                    }
                }}
                className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl snowy-bg p-0 text-white shadow-2xl backdrop:bg-black/75"
            >
                <div className="relative overflow-hidden rounded-2xl">
                    <div className="p-6 sm:p-8">
                        <button
                            type="button"
                            onClick={() => rewardModalRef.current?.close()}
                            aria-label="Zamknij"
                            className="absolute hover:cursor-pointer right-4 top-4 flex h-9 w-9 flex items-center justify-center"
                        >
                            <img src={removeIcon} alt="remove icon" className="w-6 h-6 invert transition-all hover:opacity-70" />
                        </button>

                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                            Wesołych Świąt!
                        </p>
                        <h2 id="reward-modal-title" className="mb-5 pr-8 text-2xl font-black sm:text-3xl">
                            {claimedReward?.name ?? claimedReward?.title ?? "Gratulacje!"}
                        </h2>

                        {claimedReward?.description && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-gray-300">
                                {claimedReward.description}
                            </p>
                        )}

                        {claimedReward?.additional_info && (
                            <div className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/10 p-4">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-200">
                                    Kod nagrody
                                </p>
                                <p className="break-all font-mono text-lg font-bold text-white">
                                    {claimedReward.additional_info}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </dialog>
            <header className="mb-6">
                <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">Kalendarz adwentowy</h1>
            </header>
            {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {days.map((day) => (
                    <CalendarTile
                        ite={day}
                        key={day}
                        on={day === currentDay}
                        onClick={generateReward}
                        disabled={!currentUser || todayOpened || isClaiming || rewards.length === 0}
                    />
                ))}
            </div>
            <header className="mb-6">
                <h1 className="break-words text-2xl font-bold text-white sm:text-3xl mt-4">Twoje nagrody</h1>
                {userRewards ? (
                    <div>
                        {
                            userRewards.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 py-4">
                                    {userRewards.map((reward) => (
                                        <article key={reward.id} className="border-2 border-border bg-bg p-4">
                                            <h2 className="font-bold text-white">{reward.name}</h2>
                                            {reward.description && (
                                                <p className="mt-2 text-sm text-gray-300">{reward.description}</p>
                                            )}
                                            {reward.additional_info && (
                                                <p className="mt-2 break-all font-mono text-sm text-sky-200">
                                                    {reward.additional_info}
                                                </p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Nie masz jeszcze odebranych nagród.</p>
                            )
                        }
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Ładowanie nagród...</p>
                )}
            </header>
        </section>
    )
}

export default Calendar;