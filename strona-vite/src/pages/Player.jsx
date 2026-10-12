import { useLocation } from "react-router-dom";

const Player = () => {
    const location = useLocation();
    const name = location.state?.name;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4 text-white">{name}</h1>
        </div>
    )
}

export default Player;