
import { useNavigate } from "react-router-dom";

const Row = ({ id, name, team }) => {
    const navigate = useNavigate();

    return (
        <tr
            onClick={() => navigate("/player", { state: { id } })}
            className="bg-bg-light text-white hover:bg-rose-800 transition-colors mb-4 shadow-md hover:cursor-pointer"
        >
            <td className="text-start p-6 text-lg font-bold">
                {name}
            </td>

            <td className="text-end p-6 text-lg font-bold">
                {team ?? "Bez drużyny"}
            </td>

        </tr>
    );
};

export default Row;
