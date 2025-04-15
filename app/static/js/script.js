document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("sensor-data").getContext("2d");
  fetch("/api/sensor/data/1")
    .then((response) => response.json())
    .then((data) => {
      // Převedení dat na formát pro graf
      const labels = data.map((item) =>
        new Date(item.Time).toLocaleTimeString()
      );
      const values = data.map((item) => item.Value);
      console.log(labels, values);
      console.log("testik ");
      // Vykreslení grafu
      new Chart(ctx, {
        type: "radar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Teplota (°C)",
              data: values,
              borderColor: "blue",
              backgroundColor: "rgba(0, 0, 255, 0.1)",
              borderWidth: 2,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Čas" } },
            y: { title: { display: true, text: "Teplota (°C)" } },
          },
        },
      });
    })
    .catch((error) => console.error("Chyba při načítání dat:", error));
});
