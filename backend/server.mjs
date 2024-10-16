import ServiceDao from './dao/service.mjs';
import StatisticDao from './dao/statistics.mjs';
import cors from'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io'; // Import socket.io using ES modules

const app = express();
const serviceDao = new ServiceDao();
const statisticDao = new StatisticDao();
const PORT = 3001;
const PORT1 = 4001;

app.use(express.json());
// Create the HTTP server using the Express app
const server1 = createServer(app);

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005"],
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cors(corsOptions));

// Initialize a new instance of socket.io
const io = new Server(server1, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005"], // Allow requests from your frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Listen for new connections
io.on('connection', (socket) => {
  console.log('frontend connected:', socket.id);

  // Handle disconnection
  socket.on('disconnect', () => {
    //console.log('frontend disconnected');
  });
});



/*Get new ticket API*/
app.post('/api/newTicket', async (req, res) => {
  try {
    const { serviceName } = req.body;  // Estrarre il serviceName dal body della richiesta
    if (!serviceName) {
      return res.status(400).json({ error: 'Missing serviceName in request body' });
    }

    const result = await serviceDao.newTicket(serviceName);  // Passiamo il serviceName estratto dal body
    if (!result) {
        res.status(404).json(result);
    } else {
        res.json({
            //message: 'Ticket created successfully',
            ticket: result
        });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add services
app.post('/api/addService', async (req, res) => {
  const { name, serviceTime } = req.body;
  
  if (!name || !serviceTime) {
      return res.status(400).json({ error: 'name and serviceTime are required' });
  }

  try {
      const result = await serviceDao.addService(name, serviceTime);
      res.status(201).json({ message: 'Service added successfully', serviceId: result });
  } catch (err) {
      if (err.message.includes("UNIQUE constraint")) {
          res.status(409).json({ error: 'Service name must be unique' });
      } else {
          res.status(500).json({ error: 'Internal server error' });
      }
  }
});

/* Get all available services API */
app.get('/api/services', async(req, res) => {
    try{
      const result = await serviceDao.getServices();
      if(result.error)
          res.status(404).json(result);
      else
        res.json(result);
    }catch(err){
      res.status(500).end();
    }
  });


/* Get all counters API */
app.get('/api/counters', async (req, res) => {
  try {
      const result = await serviceDao.getCounters();
      res.json(result);
  } catch (err) {
      if (err.message === "No counter found") {
          res.status(404).json({ error: "No counter found" });
      } else {
        res.status(500).json({ error: "Internal server error" }); 
      }
  }
});


// Call next customer
app.post('/api/callNextCustomer', async (req, res) => {
  const { counterId } = req.body;

  if (!counterId) {
      return res.status(400).json({ error: 'Missing counterId in request body' });
  }

  try {
      const result = await serviceDao.callNextCustomer(counterId);

      if (result.error) {
          return res.status(404).json(result); 
      }

      io.emit('nextCustomer', {
          counterId: result.counterId,
          service: result.serviceName,
          customerNumber: result.nextCustomerNumber,
          newQueueLength: result.newQueueLength
      });

      res.status(200).json({
          nextCustomerNumber: result.nextCustomerNumber,
          counterId: result.counterId,
          serviceName: result.serviceName,
          newQueueLength: result.newQueueLength
      });
  } catch (error) {
      if (error.message === "Counter not found") {
          return res.status(404).json({ error: 'Counter not found' });
      }
      if (error.message === "Error fetching services for counter") {
          return res.status(500).json({ error: 'Error fetching services for counter' });
      }

      console.error('Internal server error:', error); 
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* Get all customers for each counter by day API */
app.get('/api/statistics/getCustomersForEachCounterByDay', async (req, res) => {
  try {
      const result = await statisticDao.getCustomersForEachCounterByDay();
      res.json(result);
  } catch (err) {
      if (err.message === "No stats for any counter") {
          res.status(404).json({ error: "No stats for any counter" });
      } else {
        res.status(500).json({ error: "Internal server error" }); 
      }
  }
});

/* Get all customers for each counter by week API */
app.get('/api/statistics/getCustomersForEachCounterByWeek', async (req, res) => {
  try {
      const result = await statisticDao.getCustomersForEachCounterByWeek();
      res.json(result);
  } catch (err) {
      if (err.message === "No stats for any counter") {
          res.status(404).json({ error: "No stats for any counter" });
      } else {
        res.status(500).json({ error: "Internal server error" }); 
      }
  }
});

/* Get all customers for each counter by month API */
app.get('/api/statistics/getCustomersForEachCounterByMonth', async (req, res) => {
  try {
      const result = await statisticDao.getCustomersForEachCounterByMonth();
      res.json(result);
  } catch (err) {
      if (err.message === "No stats for any counter") {
          res.status(404).json({ error: "No stats for any counter" });
      } else {
        res.status(500).json({ error: "Internal server error" }); 
      }
  }
});

// Get customers for each counter divided by service type
// app.get('/api/getCustomersForEachCounterByService', async (req, res) => {
//   try {
//       const result = await statisticDao.getCustomersForEachCounterByService();
//       res.json(result);
//   } catch (err) {
//       if (err.message === "No stats found for any counter and service") {
//           return res.status(404).json({ error: "No stats found for any counter and service" });
//       } else {
//           return res.status(500).json({ error: "Internal server error" });
//       }
//   }
// });

// Route to get the customers served per service on a specific day
/*app.get('/api/statistics/customersForServiceOnDay/:day', async (req, res) => {
  const day = req.params.day;
  try {
      const result = await statisticDao.getCustomersForServiceByDay(day);
      res.json(result);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});*/

// Route to get the customers served per service, grouped by day
app.get('/api/statistics/customersForServiceByDay', async (req, res) => {
  try {
      const result = await statisticDao.getCustomersForServiceByDay();
      res.json(result);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/*// Route to get the customers served per service on a specific week of a year
app.get('/api/statistics/customersForServiceOnWeek/:week/:year', (req, res) => {
  const week = parseInt(req.params.week);  // Take the week from the URL
  const year = parseInt(req.params.year);  // Take the year from the URL
  
  // Check input
  if (isNaN(week) || isNaN(year) || week < 1 || week > 53) {
      return res.status(400).json({ error: "Invalid week or year" });
  }

  statisticDao.getCustomersForServiceByWeek(week, year)
      .then(stats => {
          res.json(stats);  // Return data in JSON format
      })
      .catch(err => {
          res.status(500).json({ error: err.message });
      });
});*/

// Route to get the customers served per service, grouped by week
app.get('/api/statistics/customersForServiceByWeek', async (req, res) => {
  try {
      const stats = await statisticDao.getCustomersForServiceByWeek();
      res.json(stats);  // Return data in JSON format
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

/*app.get('/api/statistics/customersForServiceOnMonth/:month/:year', (req, res) => {
  const month = parseInt(req.params.month);
  const year = parseInt(req.params.year);

  // Check input
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid month or year" });
  }

  statisticDao.getCustomersForServiceByMonth(month, year)
      .then(stats => {
          res.json(stats);
      })
      .catch(err => {
          res.status(500).json({ error: err.message });
      });
});*/

// Route to get the customers served per service, grouped by month
app.get('/api/statistics/customersForServiceByMonth', async (req, res) => {
  try {
      const stats = await statisticDao.getCustomersForServiceByMonth();
      res.json(stats);  // Return data in JSON format
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});


// Get daily stats for customers at each counter by service type
app.get('/api/getDailyCustomersForEachCounterByService', async (req, res) => {
  try {
      const result = await statisticDao.getDailyCustomersForEachCounterByService();
      res.json(result);
  } catch (err) {
      if (err.message.includes("No daily stats")) {
          return res.status(404).json({ error: err.message });
      } else {
          return res.status(500).json({ error: "Internal server error" });
      }
  }
});

app.get('/api/getWeeklyCustomersForEachCounterByService', async (req, res) => {
  try {
      const result = await statisticDao.getWeeklyCustomersForEachCounterByService();
      res.json(result);
  } catch (err) {
      if (err.message.includes("No weekly stats found")) {
          return res.status(404).json({ error: err.message });
      } else {
          console.error("API Error:", err);
          return res.status(500).json({ error: "Internal server error" });
      }
  }
});


 // Get monthly stats for customers at each counter by service type
 app.get('/api/getMonthlyCustomersForEachCounterByService', async (req, res) => {
  try {
      const result = await statisticDao.getMonthlyCustomersForEachCounterByService();
      res.json(result);
  } catch (err) {
      if (err.message.includes("No monthly stats")) {
          return res.status(404).json({ error: err.message });
      } else {
          return res.status(500).json({ error: "Internal server error" });
      }
  }
});

/* ACTIVATING THE SERVER */
let server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

let socket = server1.listen(PORT1, () => {
  console.log(`Socket.io server is running on port ${PORT1}`);
});

// Get overall stats for each service type
app.get('/api/getOverallStats', async (req, res) => {
  try{
    const {period} = req.query; 
    if (!period || !['daily', 'weekly'].includes(period)){
      return res.status(400).json({error: "Invalid period. Use daily or weekly"})
    }

    const result = await statisticDao.getOverallStats(period);
    res.json(result);
  } catch (err) {
    if (err.message === "No stats found for the given period"){
      res.status(400).json({error: "No stats found for the given period"});
    } else {
      res.status(500).json({ error: "Internal server error"})
    }
  }
});

export { app, server, socket }