const PrivacyPolicy = () => (
    <article className="mx-auto max-w-4xl space-y-8 text-gray-300">
        <header className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                Dokumenty
            </p>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
                Polityka prywatności
            </h1>
            <p className="text-sm text-gray-400">
                Ostatnia aktualizacja: 4 listopada 2026 r.
            </p>
        </header>

        <aside className="border border-amber-300/30 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
            <strong>Projekt do uzupełnienia przed publikacją.</strong> Właściciel
            serwisu musi podać pełne dane administratora i kontakt, ustalić okresy
            przechowywania oraz potwierdzić informacje o hostingu i konfiguracji
            Supabase. Tych danych nie da się wiarygodnie ustalić z kodu strony.
        </aside>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">1. Administrator</h2>
            <p>
                Administratorem danych osobowych jest podmiot prowadzący serwis
                PODZIEMIE CS2: ta1nz.
                Kontakt w sprawach prywatności:{" "}
                test@test.pl.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Jakie dane przetwarzamy</h2>
            <ul className="list-disc space-y-2 pl-6">
                <li>
                    <strong className="text-white">Logowanie przez Discord:</strong>{" "}
                    identyfikator konta Discord, identyfikator użytkownika w bazie danych
                    oraz - zależnie od danych udostępnionych przez Discord - nazwa,
                    adres e-mail i adres avataru. Nie ma rejestracji hasłem w tej
                    aplikacji.
                </li>
                <li>
                    <strong className="text-white">Profil konta:</strong>{" "}
                    nazwa, e-mail, avatar, rola konta, czas utworzenia i ostatniego
                    logowania. Dane te są powiązane z identyfikatorem konta.
                </li>
                <li>
                    <strong className="text-white">Dane publikowane o graczach i drużynach:</strong>{" "}
                    pseudonimy i nazwy, link do profilu Steam, SteamID64 i
                    identyfikatory FACEIT, a także skład, wyniki i statystyki. Dane
                    te mogą dotyczyć osób możliwych do zidentyfikowania.
                </li>
                <li>
                    <strong className="text-white">Treści serwisu:</strong>{" "}
                    autor, tytuł, treść i grafika artykułu, informacje o meczach,
                    transferach i turniejach. Administratorzy wprowadzają
                    te informacje samemu.
                </li>
                <li>
                    <strong className="text-white">Dane techniczne:</strong>{" "}
                    przeglądarka przechowuje dane sesji logowania. Informacje o adresie IP i logach mogą
                    być przetwarzane przez dostawcę hostingu lub usługi backendowej.
                </li>
            </ul>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. Cele i podstawy prawne</h2>
            <p>
                Dane konta są wykorzystywane do logowania i obsługi profilu. Dane
                graczy, drużyn, meczów i artykułów służą prowadzeniu oraz
                prezentowaniu serwisu. Identyfikatory Steam i FACEIT są używane do
                pobierania danych profilu oraz statystyk. Dane techniczne pomagają
                utrzymać bezpieczeństwo i działanie strony.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Odbiorcy i usługi zewnętrzne</h2>
            <ul className="list-disc space-y-2 pl-6">
                <li>
                    <strong className="text-white">Discord</strong> obsługuje
                    logowanie OAuth. Po rozpoczęciu logowania użytkownik korzysta
                    także z usług Discord i podlega ich zasadom prywatności.
                </li>
                <li>
                    Dostawca hostingu może przetwarzać dane techniczne wymagane do
                    dostarczania strony. Przed publikacją należy wpisać jego nazwę,
                    sprawdzić lokalizację przetwarzania danych i warunki transferów
                    poza EOG.
                </li>
            </ul>
            <p>
                Strona zawiera również odnośniki do Discorda i X. Przejście do
                zewnętrznego serwisu oznacza, że jego operator może przetwarzać dane
                zgodnie z własną polityką.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Okres przechowywania</h2>
            <p>
                Dane konta są przechowywane do czasu otrzymania żądania ich
                usunięcia. Administrator musi zapewnić obsługę takiego żądania
                również w usługach, z których korzysta. Okresy przechowywania
                publicznych treści, danych graczy, logów i kopii zapasowych:
                <strong className="text-white"> [uzupełnij po sprawdzeniu konfiguracji i praktyki]</strong>.
                Dane historyczne dotyczące kalendarza nie są już zbierane, ale
                mogą pozostać w bazie. Należy je usuwać na żądanie razem z danymi
                powiązanymi z kontem.
                {" "}Wersje robocze administratora pozostają w pamięci używanej
                przeglądarki do czasu ich usunięcia lub wyczyszczenia tej pamięci.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">6. Prawa osób, których dane dotyczą</h2>
            <p>
                W granicach przewidzianych prawem można żądać dostępu do danych,
                ich sprostowania, usunięcia lub ograniczenia przetwarzania, wnieść
                sprzeciw, a w odpowiednich przypadkach skorzystać z prawa do
                przenoszenia danych. Zgodę - jeśli przetwarzanie rzeczywiście
                odbywa się na jej podstawie - można wycofać bez wpływu na
                wcześniejsze przetwarzanie. Przysługuje również skarga do Prezesa
                Urzędu Ochrony Danych Osobowych.
            </p>
            <p>
                W sprawie realizacji praw skontaktuj się z administratorem pod
                adresem wskazanym w sekcji 1. Konto nie ma obecnie funkcji
                samodzielnego usunięcia; przed publikacją należy uruchomić
                monitorowany kanał kontaktu i opisać procedurę obsługi żądania.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">7. Zmiany polityki</h2>
            <p>
                Polityka może być aktualizowana, gdy zmieni się sposób działania
                serwisu lub przetwarzania danych. Aktualna wersja jest publikowana
                na tej stronie.
            </p>
        </section>
    </article>
);

export default PrivacyPolicy;
