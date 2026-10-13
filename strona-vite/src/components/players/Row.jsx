
import { Link, useNavigate } from "react-router-dom";

const Row = ({ name, team }) => {
    const navigate = useNavigate();

    return (
        <tr
            onClick={() => navigate("/player", { state: { name } })}
            className="bg-bg-light text-white hover:bg-rose-800 transition-colors mb-4 shadow-md hover:cursor-pointer"
        >
            <td className="text-start p-6 text-lg font-bold">
                {name}
            </td>

            <td className="text-end p-6 text-lg font-bold">
                {team}
            </td>

            {/*
            <td className="font-medium p-6 text-start">
                <Link
                    to="/team"
                    state={{ team }}
                    className="text-start"
                    onClick={(event) => event.stopPropagation()}
                >
                    {team}
                </Link>
            </td>
            */}
        </tr>
    );
};

export default Row;
