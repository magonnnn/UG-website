import { Link } from "react-router-dom";
const Row = ({ name, team, avatar, ranking }) => {

    return (
        <tr className="bg-bg-light text-white hover:bg-rose-800 transition-colors mb-4 shadow-md hover:cursor-pointer">
            <td className="text-start p-6 border-primary border-s-6 text-lg font-bold"><p>{name}</p></td>
            <td className="text-end p-6 text-lg font-bold">Drużyna: {team ? team + " #" + ranking : "Brak"}</td>
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