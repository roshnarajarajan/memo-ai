import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center px-6">
      <div className="max-w-4xl text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-6">
          MEMO.AI
        </h1>

        <p className="text-xl text-gray-700 mb-8">
          Personal Memory Assistant for Patients and Caregivers.
          Manage routines, memories, voice assistance,
          facial recognition and object tracking in one place.
        </p>

        <div className="flex gap-4 justify-center">
          <Link to="/login">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-lg">
              Login
            </button>
          </Link>

          <Link to="/signup">
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl text-lg">
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;