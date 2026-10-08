import { useLocation } from "react-router-dom";

const Player = () => {
    const location = useLocation();
    const player = location.state?.player;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4 text-white">{player}</h1>
        </div>
    )
}

export default Player;