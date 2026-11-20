const PrivacyPolicy = () => (

    <article className="max-w-4xl space-y-8 text-gray-300">
        <header className="space-y-3">
            <h1 className="text-3xl font-black text-white sm:text-4xl">
                Polityka prywatności
            </h1>
            <p className="text-sm text-gray-400">
                Ostatnia aktualizacja: 20 listopada 2026 r.
            </p>
        </header>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">1. Administrator danych</h2>
            <p>
                Administratorem danych osobowych jest osoba prywatna - Michał
                Żołdak. Kontakt z administratorem jest możliwy pod adresem:
                underground.community@wp.pl.
            </p>
            <p>
                Administrator odpowiada za przetwarzanie danych osobowych
                zgodnie z obowiązującymi przepisami, w szczególności
                Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679
                z dnia 27 kwietnia 2016 r. (RODO).
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Zakres przetwarzanych danych</h2>
            <p>
                Podczas korzystania z serwisu i logowania za pośrednictwem
                Discord przetwarzamy następujące dane:
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li>identyfikator użytkownika Discord;</li>
                <li>nazwę użytkownika Discord;</li>
                <li>adres e-mail powiązany z kontem Discord;</li>
                <li>awatar użytkownika Discord;</li>
                <li>datę ostatniego logowania do serwisu;</li>
                <li>informacje dotyczące sesji użytkownika, przechowywane w pamięci lokalnej przeglądarki (localStorage), w zakresie niezbędnym do uwierzytelnienia.</li>
            </ul>
            <p>
                Dane te są zapisywane w bazie danych i wykorzystywane
                do identyfikacji użytkownika, obsługi konta oraz
                udostępniania funkcji serwisu.
            </p>
            <p>
                Ponadto przetwarzamy identyfikatory graczy, nazwy użytkowników,
                publiczne profile oraz statystyki związane z rozgrywkami,
                pobierane za pośrednictwem FACEIT Data API i wykorzystywane
                do prezentowania informacji o graczach i rozgrywkach w serwisie.
                Dane te mogą dotyczyć również osób, które nie posiadają konta
                w naszym serwisie.
            </p>
            <p>
                W związku z korzystaniem z serwisu mogą być również
                przetwarzane informacje techniczne niezbędne do jego
                prawidłowego działania i zapewnienia bezpieczeństwa.
            </p>
            <p>
                Hasło do konta Discord nie jest przekazywane administratorowi
                ani przechowywane w bazie danych serwisu. Uwierzytelnianie
                odbywa się za pośrednictwem Discord OAuth2.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. Cele i podstawy prawne przetwarzania</h2>
            <p>
                Dane osobowe przetwarzamy wyłącznie w zakresie niezbędnym
                do realizacji następujących celów:
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li>
                    <strong className="text-white">Tworzenie i obsługa kont użytkowników</strong>
                    {" "} - na podstawie art. 6 ust. 1 lit. b RODO,
                    w celu świadczenia usług drogą elektroniczną.
                </li>
                <li>
                    <strong className="text-white">Logowanie przez Discord</strong>
                    {" "} - na podstawie art. 6 ust. 1 lit. b RODO,
                    w zakresie niezbędnym do uwierzytelnienia użytkownika
                    i zapewnienia dostępu do jego konta.
                </li>
                <li>
                    <strong className="text-white">Prezentowanie profili i statystyk graczy</strong>
                    {" "} - na podstawie art. 6 ust. 1 lit. f RODO, czyli
                    prawnie uzasadnionego interesu administratora polegającego
                    na rozwijaniu i utrzymywaniu funkcjonalności serwisu oraz
                    prezentowaniu publicznie dostępnych informacji o graczach,
                    wynikach i statystykach rozgrywek. Interes ten jest
                    realizowany z uwzględnieniem praw i wolności osób,
                    których dane dotyczą.
                </li>
                <li>
                    <strong className="text-white">Zapewnienie bezpieczeństwa serwisu</strong>
                    {" "} - na podstawie art. 6 ust. 1 lit. f RODO,
                    czyli prawnie uzasadnionego interesu administratora,
                    polegającego na ochronie serwisu przed nadużyciami,
                    nieuprawnionym dostępem i zakłóceniami jego działania,
                    a także na ustalaniu, dochodzeniu lub obronie przed
                    ewentualnymi roszczeniami.
                </li>
                <li>
                    <strong className="text-white">Wypełnianie obowiązków prawnych</strong>
                    {" "} - na podstawie art. 6 ust. 1 lit. c RODO,
                    jeżeli administrator jest zobowiązany do przetwarzania
                    danych na podstawie obowiązujących przepisów.
                </li>
            </ul>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Źródło danych</h2>
            <p>
                Dane profilu użytkownika pozyskujemy bezpośrednio od niego
                za pośrednictwem Discord podczas procesu logowania.
            </p>
            <p>
                Dane udostępniane przez Discord obejmują identyfikator,
                nazwę użytkownika, adres e-mail oraz awatar, zgodnie
                z zakresem udzielonych uprawnień OAuth2.
            </p>
            <p>
                Identyfikatory graczy, nazwy użytkowników, publiczne profile
                i statystyki rozgrywek pozyskujemy za pośrednictwem FACEIT
                Data API. Dane te pochodzą z platformy FACEIT i mogą dotyczyć
                również osób, które nie posiadają konta w naszym serwisie.
                Informacje są pobierane w zakresie udostępnianym przez API
                i wykorzystywanym do prezentowania profili oraz statystyk.
            </p>
            <p>
                W przypadku pozyskiwania danych osobowych z FACEIT, czyli
                ze źródła innego niż bezpośrednio od osoby, której dane
                dotyczą, administrator realizuje obowiązek informacyjny
                wynikający z art. 14 RODO, w zakresie, w jakim ma on
                zastosowanie, z uwzględnieniem wyjątków przewidzianych
                w tym przepisie.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Usługi zewnętrzne i odbiorcy danych</h2>
            <p>
                Do prawidłowego działania serwisu wykorzystujemy usługi
                zewnętrznych dostawców infrastruktury:
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li>
                    <strong className="text-white">Discord</strong> -
                    dostawca usługi logowania i uwierzytelniania użytkowników.
                    Za pośrednictwem Discord OAuth2 pobieramy dane profilu
                    udostępnione przez użytkownika.
                </li>
                <li>
                    <strong className="text-white">Cloudflare Pages</strong> -
                    dostawca hostingu i infrastruktury wykorzystywanej
                    do udostępniania frontendowej części serwisu.
                </li>
                <li>
                    <strong className="text-white">Supabase</strong> -
                    dostawca backendu, bazy danych oraz mechanizmu
                    uwierzytelniania Supabase Auth, wykorzystywanego
                    do obsługi kont i sesji użytkowników.
                </li>
                <li>
                    <strong className="text-white">FACEIT</strong> -
                    dostawca platformy, z której za pośrednictwem
                    FACEIT Data API pobieramy publiczne informacje
                    o profilach graczy i statystykach rozgrywek.
                </li>
            </ul>
            <p>
                Dostawcy usług mogą przetwarzać dane osobowe w zakresie
                niezbędnym do świadczenia swoich usług, utrzymania
                infrastruktury i zapewnienia bezpieczeństwa. W zależności
                od charakteru usługi i zakresu operacji dany dostawca
                może działać jako podmiot przetwarzający dane na zlecenie
                administratora albo jako odrębny administrator danych.
            </p>
            <p>
                Dane mogą być również udostępniane uprawnionym organom
                publicznym, jeżeli obowiązek taki wynika z przepisów prawa.
            </p>
            <p>
                Dane osobowe nie są sprzedawane ani wykorzystywane
                do celów reklamowych.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">6. Przekazywanie danych poza Europejski Obszar Gospodarczy</h2>
            <p>
                W związku z korzystaniem z usług Discord, Cloudflare
                i Supabase dane osobowe mogą być przetwarzane lub
                udostępniane poza Europejskim Obszarem Gospodarczym.
            </p>
            <p>
                Lokalizacja infrastruktury, na której przechowywane są dane,
                zależy między innymi od konfiguracji projektu Supabase.
                Nie oznacza to jednak, że wszystkie operacje techniczne,
                kopie zapasowe, logi lub czynności związane ze wsparciem
                technicznym odbywają się wyłącznie w wybranym regionie.
            </p>
            <p>
                Jeżeli dochodzi do przekazywania danych poza EOG,
                odbywa się ono zgodnie z rozdziałem V RODO, w szczególności
                na podstawie decyzji stwierdzającej odpowiedni stopień
                ochrony, standardowych klauzul umownych lub innego
                mechanizmu przewidzianego przez obowiązujące przepisy.
            </p>
            <p>
                Szczegółowe informacje dotyczące zabezpieczeń stosowanych
                przez poszczególnych dostawców można znaleźć w ich
                dokumentacji dotyczącej ochrony danych osobowych.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">7. Okres przechowywania danych</h2>
            <p>
                Dane osobowe przechowujemy wyłącznie przez okres niezbędny
                do realizacji celów, dla których zostały zebrane,
                z uwzględnieniem obowiązujących przepisów prawa.
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li>
                    Dane konta, w tym identyfikator Discord, nazwa,
                    adres e-mail i awatar, przechowujemy przez okres
                    korzystania z konta.
                </li>
                <li>
                    Datę ostatniego logowania przechowujemy w celu
                    obsługi konta i zapewnienia bezpieczeństwa serwisu.
                </li>
                <li>
                    Identyfikatory graczy, profile i statystyki
                    przechowujemy tak długo, jak są potrzebne
                    do prezentowania rozgrywek i świadczenia funkcji serwisu.
                </li>
                <li>
                    Informacje techniczne związane z bezpieczeństwem
                    przechowujemy przez okres niezbędny do wykrywania
                    i przeciwdziałania nadużyciom.
                </li>
            </ul>
            <p>
                Po otrzymaniu żądania usunięcia konta administrator
                usuwa dane konta i powiązane dane osobowe z wykorzystywanej
                bazy danych, o ile dalsze przechowywanie nie jest
                wymagane przez prawo.
            </p>
            <p>
                Dane znajdujące się w kopiach zapasowych lub logach
                technicznych mogą podlegać odrębnym cyklom przechowywania
                stosowanym przez dostawców infrastruktury. Nie są one
                wykorzystywane do zwykłego korzystania z usuniętego konta.
                Informacje techniczne i logi są przechowywane przez okres
                niezbędny do zapewnienia bezpieczeństwa oraz wykrywania
                i przeciwdziałania nadużyciom, zgodnie z konfiguracją
                wykorzystywanych usług.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">8. Pliki cookies i dane przeglądarki</h2>
            <p>
                Serwis nie prowadzi własnej analityki internetowej
                ani nie wykorzystuje plików cookies do celów reklamowych.
            </p>
            <p>
                W związku z logowaniem i utrzymywaniem sesji użytkownika
                Supabase Auth wykorzystuje pamięć lokalną przeglądarki
                (localStorage) do przechowywania informacji związanych
                z sesją i utrzymywaniem uwierzytelnienia. Mechanizm ten
                służy zapewnieniu dostępu do funkcji serwisu wymagających
                zalogowania. W zakresie, w jakim jest niezbędny do
                świadczenia usługi żądanej przez użytkownika, może
                korzystać z wyjątku przewidzianego w art. 399 ustawy
                – Prawo komunikacji elektronicznej.
            </p>
            <p>
                Dostawcy infrastruktury mogą również stosować własne
                mechanizmy techniczne niezbędne do zapewnienia
                bezpieczeństwa i prawidłowego działania usług. Jeżeli
                serwis zacznie wykorzystywać dodatkowe mechanizmy
                przechowywania informacji lub uzyskiwania do nich dostępu,
                które nie są niezbędne do świadczenia usługi, będą one
                stosowane zgodnie z obowiązującymi przepisami, w tym
                z uwzględnieniem obowiązku uzyskania zgody, jeżeli jest
                wymagana.
            </p>
            <p>
                Użytkownik może zarządzać ustawieniami dotyczącymi
                przechowywania informacji w przeglądarce za pomocą
                jej ustawień. Ograniczenie niezbędnych mechanizmów
                przechowywania może spowodować nieprawidłowe działanie
                logowania lub innych funkcji serwisu.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">9. Publiczne profile i statystyki graczy</h2>
            <p>
                Serwis prezentuje identyfikatory graczy, publiczne profile
                oraz statystyki związane z rozgrywkami, pobierane
                za pośrednictwem FACEIT Data API. Informacje te są
                dostępne publicznie dla wszystkich odwiedzających serwis,
                również osób niezalogowanych, i mogą dotyczyć osób,
                które nie posiadają konta w serwisie.
            </p>
            <p>
                Dane te są wykorzystywane w celu prezentowania wyników,
                przebiegu rozgrywek oraz zapewnienia funkcji związanych
                z analizą statystyk graczy.
            </p>
            <p>
                Jeżeli prezentowane informacje dotyczą danej osoby
                i są nieprawidłowe, nieaktualne lub osoba ta uważa,
                że nie powinny być dalej przetwarzane, może skontaktować
                się z administratorem w celu zgłoszenia żądania
                sprostowania, usunięcia lub ograniczenia przetwarzania
                danych, a także wnieść sprzeciw wobec przetwarzania
                opartego na prawnie uzasadnionym interesie administratora.
            </p>
            <p>
                Żądania są rozpatrywane indywidualnie, z uwzględnieniem
                podstaw prawnych przetwarzania oraz praw innych osób.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">10. Prawa użytkowników</h2>
            <p>
                Każdej osobie, której dane dotyczą, przysługują prawa
                wynikające z RODO, w szczególności:
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li>prawo dostępu do swoich danych osobowych;</li>
                <li>prawo do sprostowania nieprawidłowych lub niekompletnych danych;</li>
                <li>prawo do usunięcia danych w przypadkach przewidzianych przez RODO;</li>
                <li>prawo do ograniczenia przetwarzania danych;</li>
                <li>prawo do przenoszenia danych, jeżeli spełnione są warunki określone w RODO;</li>
                <li>prawo do wniesienia sprzeciwu wobec przetwarzania danych opartego na art. 6 ust. 1 lit. f RODO;</li>
                <li>
                    prawo do cofnięcia zgody w dowolnym momencie,
                    jeżeli przetwarzanie odbywa się na podstawie zgody.
                </li>
            </ul>
            <p>
                Użytkownik ma również prawo wniesienia skargi do Prezesa
                Urzędu Ochrony Danych Osobowych, jeżeli uzna, że jego dane
                są przetwarzane niezgodnie z przepisami o ochronie danych
                osobowych.
            </p>
            <p>
                Realizacja praw użytkownika jest co do zasady bezpłatna.
                Administrator odpowiada na żądania bez zbędnej zwłoki,
                nie później niż w terminie miesiąca od ich otrzymania,
                z możliwością przedłużenia tego terminu w przypadkach
                przewidzianych w RODO.
            </p>
            <p>
                W celu realizacji swoich praw użytkownik lub inna osoba,
                której dane dotyczą, może skontaktować się z administratorem
                pod adresem: underground.community@wp.pl. Administrator
                może zażądać dodatkowych informacji niezbędnych do
                potwierdzenia tożsamości osoby składającej żądanie,
                jeżeli ma uzasadnione wątpliwości co do jej tożsamości.
            </p>
            <p>
                Żądanie usunięcia konta można przesłać na wskazany adres
                e-mail. Wiadomość powinna zawierać informację o żądaniu
                usunięcia konta oraz dane umożliwiające jego odnalezienie
                i zweryfikowanie, w szczególności identyfikator Discord
                lub adres e-mail powiązany z kontem. Po pozytywnej
                weryfikacji administrator usuwa konto i powiązane z nim
                dane osobowe, o ile ich dalsze przechowywanie nie jest
                wymagane przez prawo lub nie zachodzą inne przesłanki
                przewidziane w RODO. Usunięcie konta nie oznacza
                automatycznego usunięcia publicznych informacji o graczu
                pobranych z FACEIT, jeżeli są one przetwarzane niezależnie
                od konta na innej podstawie prawnej.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">11. Obowiązek podania danych</h2>
            <p>
                Podanie danych profilu Discord wymaganych do utworzenia
                konta jest niezbędne do korzystania z funkcji serwisu
                wymagających zalogowania.
            </p>
            <p>
                Niepodanie danych wymaganych podczas logowania uniemożliwia
                utworzenie konta lub korzystanie z funkcji wymagających
                uwierzytelnienia.
            </p>
            <p>
                Publiczne profile i statystyki graczy mogą być przeglądane
                bez zakładania konta i bez logowania.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">12. Zautomatyzowane podejmowanie decyzji i profilowanie</h2>
            <p>
                Administrator nie podejmuje wobec użytkowników decyzji
                opartych wyłącznie na zautomatyzowanym przetwarzaniu danych
                osobowych, w tym profilowaniu, które wywoływałyby skutki
                prawne lub w podobny sposób istotnie wpływały na użytkowników,
                w rozumieniu art. 22 RODO. Samo prezentowanie statystyk,
                wyników i poziomów umiejętności graczy nie stanowi
                podejmowania takich decyzji przez administratora.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">13. Bezpieczeństwo danych</h2>
            <p>
                Administrator stosuje odpowiednie środki techniczne
                i organizacyjne mające na celu ochronę danych osobowych
                przed przypadkową utratą, zniszczeniem, nieuprawnionym
                dostępem, ujawnieniem lub innym niezgodnym z prawem
                przetwarzaniem.
            </p>
            <p>
                Dane są przechowywane z wykorzystaniem infrastruktury
                Supabase, a dostęp do funkcji serwisu i bazy danych
                jest realizowany z wykorzystaniem odpowiednich
                mechanizmów technicznych.
            </p>
            <p>
                Dostęp do danych jest ograniczany do zakresu niezbędnego
                do zapewnienia prawidłowego działania serwisu.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">14. Linki do zewnętrznych usług</h2>
            <p>
                Serwis może zawierać odnośniki do stron i usług należących
                do podmiotów zewnętrznych.
            </p>
            <p>
                Administrator nie odpowiada za zasady przetwarzania danych
                stosowane przez operatorów tych usług w ramach ich własnych
                platform. Po przejściu na zewnętrzną stronę użytkownik
                powinien zapoznać się z jej polityką prywatności.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">15. Zmiany polityki prywatności</h2>
            <p>
                Administrator zastrzega sobie prawo do aktualizacji
                niniejszej polityki prywatności w przypadku zmian
                w funkcjonowaniu serwisu, sposobie przetwarzania danych
                lub obowiązujących przepisach prawa.
            </p>
            <p>
                Aktualna wersja polityki prywatności jest publikowana
                w serwisie wraz z datą ostatniej aktualizacji.
            </p>
        </section>

        <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">16. Kontakt</h2>
            <p>
                W sprawach związanych z przetwarzaniem danych osobowych,
                realizacją praw wynikających z RODO oraz usuwaniem kont
                można skontaktować się z administratorem pod adresem:
            </p>
            <p>
                <a
                    href="mailto:underground.community@wp.pl"
                    className="text-white underline"
                >
                    underground.community@wp.pl
                </a>
            </p>
        </section>
    </article>

);

export default PrivacyPolicy;
