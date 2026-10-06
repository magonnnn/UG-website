import { Link } from "react-router-dom";
const Row = ({ team, ranking, roster }) => {

    return (
        <tr className="bg-bg-light text-white hover:bg-rose-800 transition-colors mb-4 shadow-md">
            <td className="border-primary border-s-6 font-medium p-6 rounded-lg"><Link to="/team" state={{ team }}>
                {team}
            </Link></td>
            <td className="font-medium p-6 text-start text-text font-thin rounded-lg">{roster.map((player, i) => { return i !== roster.length - 1 ? player + ", " : player })}</td>
            {ranking === 1 && (
                <td className="text-center p-6 font-bold rounded-lg">
                    <p className="bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center m-0 mx-auto">
                        1
                    </p>
                </td>
            )}
            {ranking === 2 && (
                <td className="text-center p-6 font-bold rounded-lg">
                    <p className="bg-gray-400 rounded-full w-8 h-8 flex items-center justify-center m-0 mx-auto">
                        2
                    </p>
                </td>
            )}
            {ranking === 3 && (
                <td className="text-center p-6 font-bold rounded-lg">
                    <p className="bg-amber-800 rounded-full w-8 h-8 flex items-center justify-center m-0 mx-auto">
                        3
                    </p>
                </td>
            )}
            {ranking > 3 && <td className="text-center p-6 rounded-lg"><p>{ranking}.</p></td>}
        </tr>
    );
};

export default Row;