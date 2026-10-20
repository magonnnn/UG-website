import { Link } from "react-router-dom";
const Row = ({ id, team, points, roster, logo, ite }) => {

    return (
        <tr className="mb-4 grid grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_auto] items-center bg-bg-light text-white shadow-md transition-colors hover:bg-rose-800 sm:table-row">
            <td className="border-primary p-2 text-center text-base font-bold sm:p-6 sm:text-lg"><p>#{ite + 1}</p></td>
            <td className="p-2 text-center text-base font-bold sm:p-6 sm:text-lg">
                {logo && <img src={logo} alt={`${team} logo`} className="h-8 w-8 object-contain sm:h-10 sm:w-10" />}
            </td>
            <td className="min-w-0 p-2 text-start font-medium sm:p-6">
                <Link to="/team" state={{ id }} className="block truncate text-start">
                    {team}
                </Link>
            </td>
            <td className="p-2 text-end font-bold text-text sm:rounded-e-md sm:p-6">{points}</td>
            <td className="col-span-full min-w-0 px-3 pb-3 text-xs font-thin text-text sm:table-cell sm:p-6 sm:text-base">
                {(roster ?? []).join(", ")}
            </td>
        </tr>

    );
};

export default Row;