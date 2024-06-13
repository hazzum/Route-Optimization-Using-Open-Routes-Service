import { useEffect, useState } from "react";
import {
  CssBaseline,
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
} from "@mui/material";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import polyline from "@mapbox/polyline";
import {
  LocalizationProvider,
  DesktopDateTimePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

function App() {
  const [jobs, setJobs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [jobTimeWindowStart, setJobTimeWindowStart] = useState(null);
  const [jobTimeWindowEnd, setJobTimeWindowEnd] = useState(null);
  const [vehicleTimeWindowStart, setVehicleTimeWindowStart] = useState(null);
  const [vehicleTimeWindowEnd, setVehicleTimeWindowEnd] = useState(null);

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setSelectedLocation(e.latlng);
      },
    });
    return null;
  }

  const handleOptimize = async () => {
    setError("");
    setSuccess("");
    if (vehicles.length === 0 || jobs.length === 0) {
      setError("Please add at least one vehicle and one job.");
      return;
    }

    const data = {
      vehicles: vehicles.map((vehicle, index) => ({
        id: index,
        start: vehicle.start,
        time_window: vehicle.time_window,
      })),
      jobs: jobs.map((job, index) => ({
        id: index,
        location: [job.lng, job.lat],
        time_windows: job.time_window ? [job.time_window] : undefined,
      })),
    };

    try {
      const response = await axios.post(
        "http://solver.vroom-project.org",
        data,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      const solution = response.data;
      const newRoutes = solution.routes.map((route) =>
        polyline.decode(route.geometry)
      );
      setRoutes(newRoutes);
      setSuccess("Routes optimized successfully!");
    } catch (error) {
      setError("Error optimizing routes. Please try again.");
    }
  };

  const addJob = () => {
    if (!selectedLocation) return;
    setJobs([
      ...jobs,
      {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        time_window:
          jobTimeWindowStart && jobTimeWindowEnd
            ? [
                Math.floor(new Date(jobTimeWindowStart).getTime() / 1000),
                Math.floor(new Date(jobTimeWindowEnd).getTime() / 1000),
              ]
            : undefined,
      },
    ]);
    setSelectedLocation(null);
    setJobTimeWindowStart(null);
    setJobTimeWindowEnd(null);
  };

  const addVehicle = () => {
    if (!selectedLocation) return;
    setVehicles([
      ...vehicles,
      {
        start: [selectedLocation.lng, selectedLocation.lat],
        end: [selectedLocation.lng, selectedLocation.lat],
        time_window:
          vehicleTimeWindowStart && vehicleTimeWindowEnd
            ? [
                Math.floor(new Date(vehicleTimeWindowStart).getTime() / 1000),
                Math.floor(new Date(vehicleTimeWindowEnd).getTime() / 1000),
              ]
            : undefined,
      },
    ]);
    setSelectedLocation(null);
    setVehicleTimeWindowStart(null);
    setVehicleTimeWindowEnd(null);
  };

  const removeJob = (index) => {
    setJobs(jobs.filter((_, i) => i !== index));
  };

  const removeVehicle = (index) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const Options = [
    { fillColor: "blue" },
    { color: "black" },
    { color: "lime" },
    { color: "purple" },
    { color: "red" },
  ];

  return (
    <div className="App">
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">Vehicle Routing Problem Solver</Typography>
        </Toolbar>
      </AppBar>
      <Container>
        <Box sx={{ my: 4 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          <Grid container spacing={3}>
            <Grid item xs={12} md={12}>
              <MapContainer
                center={[30.044461857480336, 31.235722024323206]}
                zoom={13}
                style={{ height: "400px", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <MapClickHandler />
                {selectedLocation && (
                  <Marker position={selectedLocation}></Marker>
                )}
                {jobs.map((job, index) => (
                  <Marker
                    key={index}
                    position={[job.lat, job.lng]}
                    icon={L.divIcon({
                      className: "job-marker",
                      html: `<span>${index + 1}</span>`,
                    })}
                  ></Marker>
                ))}
                {vehicles.map((vehicle, index) => (
                  <Marker
                    key={index}
                    position={[vehicle.start[1], vehicle.start[0]]}
                    icon={L.divIcon({
                      className: "vehicle-marker",
                      html: `<span>${index + 1}</span>`,
                    })}
                  ></Marker>
                ))}
                {routes.map((route, index) => (
                  <Polyline
                    key={index}
                    positions={route.map((coord) => [coord[0], coord[1]])}
                    pathOptions={Options[index] || Options[0]}
                  />
                ))}
              </MapContainer>
            </Grid>
            <Grid item xs={12} md={12}>
              <div className="w-full h-full flex flex-col items-center gap-y-2">
                <TextField
                  label="Selected Location"
                  value={
                    selectedLocation
                      ? `${selectedLocation.lat}, ${selectedLocation.lng}`
                      : ""
                  }
                  fullWidth
                  size="small"
                  margin="normal"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <div className="flex flex-rows space-x-2">
                  <div className="flex flex-col space-y-1 items-center">
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DesktopDateTimePicker
                        label="Job Time Window Start"
                        value={jobTimeWindowStart}
                        onChange={(date) => setJobTimeWindowStart(date)}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth margin="normal" />
                        )}
                      />
                      <DesktopDateTimePicker
                        label="Job Time Window End"
                        value={jobTimeWindowEnd}
                        onChange={(date) => setJobTimeWindowEnd(date)}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth margin="normal" />
                        )}
                      />
                    </LocalizationProvider>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={addJob}
                      sx={{ mr: 2 }}
                    >
                      Add Job
                    </Button>
                  </div>
                  <div className="flex flex-col space-y-1 items-center">
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DesktopDateTimePicker
                        label="Vehicle Time Window Start"
                        value={vehicleTimeWindowStart}
                        onChange={(date) => setVehicleTimeWindowStart(date)}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth margin="normal" />
                        )}
                      />
                      <DesktopDateTimePicker
                        label="Vehicle Time Window End"
                        value={vehicleTimeWindowEnd}
                        onChange={(date) => setVehicleTimeWindowEnd(date)}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth margin="normal" />
                        )}
                      />
                    </LocalizationProvider>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={addVehicle}
                    >
                      Add Vehicle
                    </Button>
                  </div>
                </div>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOptimize}
                  className="w-1/2 ml-auto"
                >
                  Optimize Routes
                </Button>
              </div>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className="mt-4">
                <Typography variant="h6">Jobs</Typography>
                {jobs.map((job, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between mt-2"
                  >
                    <Typography>{`Job ${index + 1}: ${job.lat}, ${
                      job.lng
                    }`}</Typography>
                    <Typography>{`Time Window: ${
                      job.time_window ? job.time_window.join(", ") : "None"
                    }`}</Typography>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => removeJob(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div className="w-full ml-auto text-white">
                fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
              </div>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className="mt-4">
                <Typography variant="h6">Vehicles</Typography>
                {vehicles.map((vehicle, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between mt-2"
                  >
                    <Typography>{`Vehicle ${index + 1}: ${vehicle.start[0]}, ${
                      vehicle.start[1]
                    }`}</Typography>
                    <Typography>{`Time Window: ${
                      vehicle.time_window
                        ? vehicle.time_window.join(", ")
                        : "None"
                    }`}</Typography>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => removeVehicle(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div className="w-full ml-auto text-white">
                fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
              </div>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </div>
  );
}

export default App;
