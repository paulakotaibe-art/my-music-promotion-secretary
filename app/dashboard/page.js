export default function DashboardPage() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Artist Dashboard</h1>

        <p>
          Welcome to your Music Promotion Secretary dashboard.
          This is where you will prepare and manage your song promotions.
        </p>

        <h2>Upload Your Song Details</h2>

        <form>
          <input
            type="text"
            placeholder="Song Title"
            style={{ padding: "10px", margin: "10px", width: "80%" }}
          />

          <input
            type="text"
            placeholder="Artist Name"
            style={{ padding: "10px", margin: "10px", width: "80%" }}
          />

          <input
            type="text"
            placeholder="YouTube / Song Link"
            style={{ padding: "10px", margin: "10px", width: "80%" }}
          />

          <br />

          <button
            type="submit"
            className="button"
          >
            Save Song
          </button>
        </form>
      </section>
    </main>
  );
}
