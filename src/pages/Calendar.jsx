import CalendarTile from "../components/CalendarTile";

const Calendar = () => {
    let currentTime = new Date()
    const days = []
    for (let i = 0; i < 30; i++) {
        days.push(i + 1)
    }
    return (
        <section>
            <header className="mb-6">
                <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">Kalendarz adwentowy</h1>
            </header>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 ">
                {days.map((day) => (
                    <CalendarTile ite={day} key={day} on={day == currentTime.getDate()} />
                ))}
            </div>
        </section>
    )
}

export default Calendar;