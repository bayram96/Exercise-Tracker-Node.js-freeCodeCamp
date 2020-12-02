const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new Schema({
  username: { type: String, required: true}
});
const User = mongoose.model('User', userSchema); 

app.post('/api/exercise/new-user', (req, res) => {
  const userName = req.body;
  const user = new User({
    username: userName.username
  })
  User.findOne({ 'username': userName.username}, (err, data) => {
    if (err) return console.log('err: ',err) 
    else {
    if (!data) {
        //console.log('Not found')
        user.save((err, data) => {
        if (err) return console.log(err);
        res.json(data);
        })   
    } else { 
        console.log(err)
        res.send("Username already taken");
      }
    }
  })
})
/// Left of where I need to fix Username = '' issue!!!
const exerciseSchema = new Schema({
    _id: { type: Schema.ObjectId, required: true},
    username: String,
    count: Number,
    log: [{
      _id: false,
      description: {type: String, required: true},
      duration: {type: Number, required: true},
      date: { type: Date }
    }]
  },
    { versionKey: false }
  )
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/exercise/add', (req, res) => {
  let i = 1;
  const exerciseObj = req.body;  console.log('exerciseObj: ', exerciseObj);
  let exerciseToAdd = {
    "_id": exerciseObj.userId,
    "username": '',
    "date": (!exerciseObj.date) ? new Date() : new Date(exerciseObj.date) ,
    "duration": parseInt(exerciseObj.duration),
    "description": exerciseObj.description
  };  
  
  User.findById(exerciseObj.userId, (err, data) => {
    if (err) return res.send(err) 
    else {  //console.log("data: ",(!data));
      
      if (data) {
        exerciseToAdd.username = data.username;
        exerciseToAdd.date = exerciseToAdd.date.toDateString();
        console.log(': ', exerciseToAdd);
        i = i + 1;
        res.json(exerciseToAdd);
      } else {
        res.send(`Cast to ObjectId failed for value "${exerciseObj.userId}" at path "_id" for model "Users"`);
      }
      const userExercise = new Exercise({
        _id: exerciseObj.userId,
        username: exerciseToAdd.username,
        count: 1,
        log: [{
          description: exerciseObj.description,
          duration: exerciseObj.duration,
          date: (!exerciseObj.date) ? new Date() :  new Date(exerciseObj.date)
        }]
      })
      Exercise.findById(exerciseObj.userId, (err, data) => {
        if (err) return res.send(err);
        if (!data) { console.log('Not found')
          userExercise.save((err, data) => { 
            if (err) return res.send({err: "UserId, Duration, Description fields are required"});
            //res.json(data);
            console.log('Saved data: ',data);
          })
        } else { //console.log('Found: ', exerciseToAdd);
          const dataToAdd = {
            "description": exerciseToAdd.description,
            "duration": exerciseToAdd.duration,
            "date": exerciseToAdd.date
          } 
          console.log('dataToAdd: ', dataToAdd);
          data.count++;
          data.log.push(dataToAdd);
          data.banned = true;
          data.save((err) => {
            if (err) return res.send(err);
            //console.log('Final Saved to Data: ', )
          })
        }
      })
    }
  }) 
 
  // Exercise.remove({}, (err, data) => {
  //   if (err) return console.log(err)
  // })
  
})

app.get('/api/exercise/log', (req, res) => {
  let userId = req.query.userId;
  let fromm = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = req.query.limit;
  let finalData = {};
  console.log(' ');
  console.log(userId, fromm, to, limit);
  Exercise.findById(userId, (err, data) => {
    if (err) return res.send(err);
    finalData =  {...data.toJSON()}; 
    if ((!req.query.from || !req.query.to) && !limit) return res.json(data);
    if (req.query.from || req.query.to) { console.log('Data is empty')
      //finalData._id = userId;
      //finalData.log = [];
      finalData.count = 0;
      finalData.from = fromm.toDateString();
      finalData.to = to.toDateString();
      //return res.json(finalData);
    }
    finalLog = finalData.log.filter(exercise => exercise.date >= fromm && exercise.date <= to);
    
    finalLog.forEach((e ,i, logs) => logs[i].date = logs[i].date.toDateString());
    console.log('finalData: ',finalData);
    if (limit) { 
      finalLog = [...finalData.log];
      finalLog.forEach((e ,i, logs) => logs[i].date = logs[i].date.toDateString());
      finalLog = finalLog.filter((exercise, i) => i <= limit-1);
    }
    finalData.log = finalLog;
    console.log('finallog: ',finalLog);


    finalData.count = finalData.log.length;
    res.json(finalData);

  })
  
    


})
app.get('/api/exercise/users', (req, res) => {
  User.find({}, (err, data) => {
    if (err) return res.send(err)
    else res.json(data);
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
