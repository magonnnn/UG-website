import { Link } from "react-router-dom";
const Row = ({ id, team, points, roster, logo, ite }) => {

    return (
        <tr className="bg-bg-light text-white hover:bg-rose-800 transition-colors mb-4 shadow-md">
            <td className="text-center p-6 border-primary border-s-6 text-lg font-bold"><p>#{ite + 1}</p></td>
            <td className="text-center p-6 text-lg font-bold">
                {logo && <img src={logo} alt={`${team} logo`} className="w-10 h-10 object-contain" />}
            </td>
            <td className="font-medium p-6 text-start">
                <Link to="/team" state={{ id }} className="text-start">
                    {team}
                </Link>
            </td>
            <td className="font-medium p-6 text-start text-text font-thin">{roster.map((player, i) => { return i !== roster.length - 1 ? player + ", " : player })}</td>
            <td className="font-bold p-6 text-end text-text rounded-e-md">{points}</td>
        </tr>

    );
};

export default Row;