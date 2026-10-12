import { Link } from "react-router-dom";
<<<<<<< HEAD
import { useNavigate } from "react-router-dom"
const Row = ({ name, team }) => {
    const navigate = useNavigate()

    return (
        <tr onClick={() => navigate("/player", { state: { name } })} className="bg-bg-light text-white hover:bg-rose-800 transition-colors mb-4 shadow-md hover:cursor-pointer">
=======
const Row = ({ name, team }) => {

    return (
        <tr className="bg-bg-light text-white hover:bg-rose-800 transition-colors mb-4 shadow-md hover:cursor-pointer">
>>>>>>> db943ae343079f50ee5d298376690d6e2632a857
            <td className="text-start p-6 text-lg font-bold flex flex-row items-center">{name}</td>
            <td className="text-end p-6 text-lg font-bold">{team}</td>
            {/* <td className="font-medium p-6 text-start">
                <Link to="/team" state={{ team }} className="text-start">
                    {team}
                </Link>
            </td>
            <td className="font-medium p-6 text-start text-text font-thin rounded-e-md">{roster.map((player, i) => { return i !== roster.length - 1 ? player + ", " : player })}</td> */}
        </tr>

    );
};

// <Row
//     key={user.id}
//     name={user.name}
//     team={user.teams?.name}
//     avatar={user.avatar_url}
//     ranking={user.teams?.ranking}
// />

export default Row;