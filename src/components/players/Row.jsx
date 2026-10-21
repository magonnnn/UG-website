
import { useNavigate } from "react-router-dom";

const Row = ({ id, name, team }) => {
    const navigate = useNavigate();

    return (
        <tr
            onClick={() => navigate("/player", { state: { id } })}
            className="cursor-pointer border-b border-white/5 text-sm text-gray-300 transition-colors hover:bg-white/[0.03]"
        >
            <td className="break-words px-3 py-3 text-start font-semibold text-white">
                {name}
            </td>

            <td className="px-3 py-3 text-right text-sm text-gray-400">
                {team ?? "Bez drużyny"}
            </td>

        </tr>
    );
};

export default Row;
