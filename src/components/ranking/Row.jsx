import { Link } from "react-router-dom";
const Row = ({ id, team, points, roster, logo, ite }) => {

    return (
        <tr className="border-b border-white/5 text-sm text-gray-300 transition-colors hover:bg-white/[0.03]">
            <td className="px-3 py-3 text-xs font-semibold text-gray-500">{ite + 1}</td>
            <td className="px-2 py-3">
                {logo && <img src={logo} alt={`${team} logo`} className="h-8 w-8 object-contain" />}
            </td>
            <td className="min-w-0 px-3 py-3">
                <Link to="/team" state={{ id }} className="block truncate font-semibold text-white hover:text-red-300">
                    {team}
                </Link>
            </td>
            <td className="px-3 py-3 text-right font-bold tabular-nums text-white">{points ?? 0}</td>
            <td className="hidden max-w-[220px] truncate px-3 py-3 text-xs text-gray-500 sm:table-cell" title={(roster ?? []).join(", ")}>
                {(roster ?? []).join(", ")}
            </td>
        </tr>

    );
};

export default Row;