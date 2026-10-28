import lockIcon from "../assets/lock.svg";

const CalendarTile = ({ ite, on, onClick, disabled }) => {
    return (
        on ? (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="bg-gradient-to-br from-[#1E90FF] to-[#99BADD] aspect-square border-2 border-border rounded-md flex flex-col justify-center items-center transition-all hover:scale-[0.95] disabled:cursor-not-allowed hover:cursor-pointer"
            >
                <p className="text-3xl text-white font-black">{ite}</p>
            </button>
        ) : (
            <div className="aspect-square border-2 border-border rounded-md flex flex-col justify-center items-center relative">
                <img src={lockIcon} alt="lock icon" className="absolute invert top-1 right-1 w-4 h-4" />
                <p className="text-3xl font-black">{ite}</p>
            </div>
        )
    );
};

export default CalendarTile;
