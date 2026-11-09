const PrivacyPolicy = () => (
    <article className="mx-auto max-w-4xl space-y-8 text-gray-300">
        <header className="space-y-3">
            <h1 className="text-3xl font-black text-white sm:text-4xl">
                Polityka prywatności
            </h1>
            <p className="text-sm text-gray-400">
                Ostatnia aktualizacja: 9 listopada 2026 r.
            </p>
        </header>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">Administrator</h2>
            <p>
                Administratorem danych jest prowadzący serwis PODZIEMIE CS2,
                ta1nz. Kontakt: underground.community@wp.pl.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">Dane i cele</h2>
            <p>
                Przy logowaniu przez Discord przetwarzamy udostępnione dane
                profilu, takie jak identyfikator, nazwa, adres e-mail i awatar,
                aby utworzyć i obsługiwać konto. Zapisujemy także datę ostatniego
                logowania. Hasło do Discorda nie jest nam przekazywane.
            </p>
            <p>
                Identyfikatory graczy oraz publiczne profile i statystyki
                wykorzystujemy do prezentowania rozgrywek. Dane przetwarzamy
                w celu świadczenia funkcji serwisu oraz, gdy jest to potrzebne,
                zapewnienia jego bezpieczeństwa i prawidłowego działania.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">Usługi zewnętrzne</h2>
            <p>
                Logowanie obsługuje Discord. Do działania serwisu korzystamy
                również z dostawców hostingu i infrastruktury. Podczas
                korzystania z konta przeglądarka przechowuje informacje
                niezbędne do utrzymania sesji. Serwis nie prowadzi własnej
                analityki ani reklamy.
            </p>
            <p>
                Serwis zawiera odnośniki do zewnętrznych usług. Po przejściu
                do nich zastosowanie mają zasady prywatności ich operatorów.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">Okres przechowywania</h2>
            <p>
                Dane konta przechowujemy, gdy jest ono aktywne, a po otrzymaniu
                prośby o usunięcie - usuwamy je, o ile dalsze przechowywanie nie
                jest wymagane prawem. Pozostałe dane przechowujemy tylko tak
                długo, jak są potrzebne do wskazanych celów lub wymagane przez
                prawo.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">Twoje prawa</h2>
            <p>
                Możesz żądać dostępu do swoich danych, ich sprostowania,
                usunięcia lub ograniczenia przetwarzania, a w przypadkach
                przewidzianych prawem także wnieść sprzeciw lub zażądać
                przeniesienia danych. Skargę możesz złożyć do Prezesa Urzędu
                Ochrony Danych Osobowych.
            </p>
            <p>
                W sprawach danych lub usunięcia konta napisz na
                underground.community@wp.pl.
            </p>
        </section>
    </article>
);

export default PrivacyPolicy;
