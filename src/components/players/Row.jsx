
import { useNavigate } from "react-router-dom";

const Row = ({ id, name, team }) => {
    const navigate = useNavigate();

    return (
        <tr
            onClick={() => navigate("/player", { state: { id } })}
            className="mb-4 grid grid-cols-2 items-center bg-bg-light text-white shadow-md transition-colors hover:cursor-pointer hover:bg-rose-800 sm:table-row"
        >
            <td className="col-span-2 break-words p-3 text-start text-lg font-bold sm:table-cell sm:p-6">
                {name}
            </td>

            <td className="col-span-2 border-t border-red-700/50 p-3 text-start text-sm font-bold text-text sm:table-cell sm:border-0 sm:p-6 sm:text-end sm:text-lg">
                {team ?? "Bez drużyny"}
            </td>

        </tr>
    );
};

export default Row;
