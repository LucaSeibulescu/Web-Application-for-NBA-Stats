if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const app = express();
const mysql = require("mysql");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
const passport = require("passport");
const session = require("express-session");
const { connect } = require("http2");
const port = process.env.PORT || 5000;

//connection details
const connection = mysql.createConnection({
  host: "us-cdbr-east-04.cleardb.com",
  user: "b80bfd1536a330",
  password: "6a5fde08",
  database: "heroku_2829f72f676c581",
});

//view engine
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);

//middleware: tell express to parse the req.body on every single request
app.use(express.urlencoded({ extended: true }));
//middleware: tell express to use method override(put,delete)
app.use(methodOverride("_method"));
// app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

//this middleware ensures flash won't be passed to template but have access to something called success
app.use((req, res, next) => {
  res.locals.usergroup = req.session.usergroup;
  next();
});

//render register page
app.get("/register", (req, res) => {
  res.render("user/register");
});

//register account
app.post("/register", async (req, res) => {
  try {
    const userInfo = req.body;
    const hashedPassword = await bcrypt.hash(userInfo.password, 10);
    let userValues = {
      username: userInfo.username,
      password: hashedPassword,
      email: userInfo.email,
      phone: userInfo.phone,
      usergroup: userInfo.usergroup,
    };
    //query: add user to user table
    let sql = "INSERT INTO user SET ?";
    connection.query(sql, userValues, (error, rows) => {
      if (error) throw error;
      if (!error) {
        res.redirect("/login");
      }
    });
  } catch {
    res.redirect("/register");
  }
});

//render login page
app.get("/login", (req, res) => {
  res.render("user/login");
});

//login account
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  //query: select user from table
  let sql = "SELECT * FROM user WHERE username = ?";
  connection.query(sql, [username], (error, rows) => {
    if (error) throw error;
    // console.log(rows);
    if (rows.length && bcrypt.compareSync(password, rows[0].password)) {
      req.session.username = username;
      req.session.usergroup = rows[0].usergroup;
      res.redirect("/");
    } else {
      res.redirect("/login");
    }
  });
});

//logout
app.get("/logout", (req, res) => {
  if (req.session.username) {
    req.session.destroy();
  }
  res.redirect("/login");
});

//render admin page
app.get("/admin", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  if (req.session.usergroup != "admin") {
    res.redirect("/");
  }
  //query: view team table
  connection.query(
    "SELECT * FROM user WHERE usergroup = 'fan'",
    (error, rows) => {
      if (error) throw error;
      console.log(rows);
      res.render("user/admin", { rows });
    }
  );

  // res.render("user/admin");
});

//delete user
app.post("/deleteUser", (req, res) => {
  let user_id = req.body.userid;
  let sql = `DELETE FROM user WHERE id = ${user_id}`;
  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/admin");
  });
});

//render main page
app.get("/", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("home", { message: "welcome, " + req.session.username });
});

//render team page
app.get("/team", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }

  //query: view team table
  connection.query("SELECT * FROM Team", (error, rows) => {
    if (error) throw error;
    res.render("team/team", { rows });
  });
});

//render add team page
app.get("/addTeam", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }

  res.render("team/addTeam");
});

//add team
app.post("/addTeam", (req, res) => {
  let teamInfo = req.body.team;
  let teamValues = {
    Owner_id: teamInfo.ownerid,
    Coach_id: teamInfo.coachid,
    Team_name: teamInfo.teamname,
    City: teamInfo.city,
    Points: teamInfo.points,
    Rebounds: teamInfo.rebounds,
    Assists: teamInfo.assists,
    Blocks: teamInfo.blocks,
    Steals: teamInfo.steals,
    Turnovers: teamInfo.turnovers,
    FG_rate: teamInfo.fgrate,
    FT_rate: teamInfo.ftrate,
    Wins: teamInfo.wins,
  };
  //query add team to team table
  let sql = "INSERT INTO Team SET ?";
  connection.query(sql, teamValues, (error, rows) => {
    if (error) throw error;
    if (!error) {
      res.redirect("/team");
    }
  });
});

//render update team page
app.get("/updateTeam", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("team/updateTeam");
});

//update team
app.post("/updateTeam", (req, res) => {
  let updatedVal = req.body.team.updatedVal;
  let attribute = req.body.attributes;
  let team_id = req.body.team.teamid;
  let sql;
  if (attribute == "Team_name" || attribute == "City") {
    sql = `UPDATE Team SET ${attribute} = '${updatedVal}' WHERE Team_id = ${team_id}`;
  } else {
    sql = `UPDATE Team SET ${attribute} = ${updatedVal} WHERE Team_id = ${team_id}`;
  }

  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/team");
  });
});

//render delete team page
app.get("/deleteTeam", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("team/deleteTeam");
});

//delete team
app.post("/deleteTeam", (req, res) => {
  let team_id = req.body.team.teamid;
  let sql = `DELETE FROM Team WHERE Team_id = ${team_id}`;
  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/team");
  });
});

//render coach page
//app.get("/coach", (req, res) => {
//  res.render("coach/coach");
//  }

//render coach page
app.get("/coach", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }

  //query: view coach table
  connection.query("SELECT * FROM Coach", (error, rows) => {
    if (error) throw error;
    res.render("coach/coach", { rows });
  });
});

//render add coach page
app.get("/addCoach", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }

  res.render("coach/addCoach");
});

//add coach
app.post("/addCoach", (req, res) => {
  let coachInfo = req.body.coach;
  let coachValues = {
    Coach_id: coachInfo.coachid,
    First_name: coachInfo.First_name,
    Last_name: coachInfo.Last_name,
    Teams_coached: coachInfo.Teams_coached,
    Years_coached: coachInfo.Years_coached,
    Wins: coachInfo.Wins,
    Losses: coachInfo.Losses,
    Win_percentage: coachInfo.Win_percentage,
    Championships: coachInfo.Championships,
  };
  //query add coach to coach table
  let sql = "INSERT INTO Coach SET ?";
  connection.query(sql, coachValues, (error, rows) => {
    if (error) throw error;
    if (!error) {
      res.redirect("/coach");
    }
  });
});

//render update coach page
app.get("/updateCoach", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("coach/updateCoach");
});

//update coach
app.post("/updateCoach", (req, res) => {
  let updatedVal = req.body.coach.updatedVal;
  let attribute = req.body.attributes;
  let coach_id = req.body.coach.coachid;
  let sql;
  if (attribute == "Coach_name" || attribute == "City") {
    sql = `UPDATE Coach SET ${attribute} = '${updatedVal}' WHERE Coach_id = ${coach_id}`;
  } else {
    sql = `UPDATE Coach SET ${attribute} = ${updatedVal} WHERE Coach_id = ${coach_id}`;
  }

  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/coach");
  });
});

//render delete coach page
app.get("/deleteCoach", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("coach/deleteCoach");
});

//delete coach
app.post("/deleteCoach", (req, res) => {
  let team_id = req.body.coach.coachid;
  let sql = `DELETE FROM Coach WHERE Coach_id = ${coach_id}`;
  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/coach");
  });
});

//render owner page
app.get("/owner", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }

  connection.query("SELECT * FROM owner", (error, rows) => {
    if (error) throw error;
    res.render("owner/owner", { rows });
  });
});

//render add owner page
app.get("/addOwner", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }

  res.render("owner/addOwner");
});

//add owner
app.post("/addOwner", (req, res) => {
  let ownerInfo = req.body.owner;
  let ownerValues = {
    Owner_id: ownerInfo.ownerid,
    Owner_first_name: ownerInfo.firstname,
    Owner_last_name: ownerInfo.lastname,
    Wins: ownerInfo.wins,
    Losses: ownerInfo.losses,
    Championships: ownerInfo.championships,
    Win_percentage: ownerInfo.winpercent,
  };

  let sql = "INSERT INTO owner SET ?";
  connection.query(sql, ownerValues, (error, rows) => {
    if (error) throw error;
    if (!error) {
      res.redirect("/owner");
    }
  });
});

//render update owner page
app.get("/updateOwner", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("owner/updateOwner");
});

//update owner
app.post("/updateOwner", (req, res) => {
  let updatedVal = req.body.owner.updatedVal;
  let attribute = req.body.attributes;
  let owner_id = req.body.owner.ownerid;
  let sql;
  if (attribute == "Owner_first_name" || attribute == "Owner_last_name") {
    sql = `UPDATE owner SET ${attribute} = '${updatedVal}' WHERE Owner_id = ${owner_id}`;
  } else {
    sql = `UPDATE owner SET ${attribute} = ${updatedVal} WHERE Owner_id = ${owner_id}`;
  }

  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/owner");
  });
});

//render delete owner page
app.get("/deleteOwner", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("owner/deleteOwner");
});

//delete owner
app.post("/deleteOwner", (req, res) => {
  let owner_id = req.body.owner.ownerid;
  let sql = `DELETE FROM owner WHERE Owner_id = ${owner_id}`;
  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/owner");
  });
});

//render player page
app.get("/player", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  connection.query("SELECT * FROM player", (error, rows) => {
    if (error) throw error;
    res.render("player/player", { rows });
  });
});

//render add player page
app.get("/addPlayer", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("player/addPlayer");
});

//add player
app.post("/addPlayer", (req, res) => {
  let playerInfo = req.body.player;
  let playerValues = {
    Player_ID: playerInfo.playerid,
    Team_ID: playerInfo.teamid,
    First_name: playerInfo.firstname,
    Last_name: playerInfo.lastname,
    Minutes_played: playerInfo.minutesplayed,
    Points_scored: playerInfo.points,
    Field_goal_Percent: playerInfo.fgperc,
    Three_point_percent: playerInfo.threeptperc,
    Total_rebounds: playerInfo.rebounds,
    Assists: playerInfo.assists,
    Turnovers: playerInfo.turnovers,
    Steals: playerInfo.steals,
    Blocks: playerInfo.blocks,
  };

  //query: add player to player table
  let sql = "INSERT INTO player SET ?";
  connection.query(sql, playerValues, (error, rows) => {
    if (error) throw error;
    if (!error) {
      res.redirect("/player");
    }
  });
});

//render update player page
app.get("/updatePlayer", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("player/updatePlayer");
});

//update player
app.post("/updatePlayer", (req, res) => {
  let updatedVal = req.body.player.updatedVal;
  let attribute = req.body.attributes;
  let player_id = req.body.player.playerid;
  let sql;
  if (attribute == "First_name" || attribute == "Last_name") {
    sql = `UPDATE player SET ${attribute} = '${updatedVal}' WHERE Player_ID = ${player_id}`;
  } else {
    sql = `UPDATE player SET ${attribute} = ${updatedVal} WHERE Player_ID = ${player_id}`;
  }

  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/player");
  });
});

//render delete player page
app.get("/deletePlayer", (req, res) => {
  if (!req.session.username) {
    res.redirect("/login");
  }
  res.render("player/deletePlayer");
});

//delete player
app.post("/deletePlayer", (req, res) => {
  let player_id = req.body.player.playerid;
  let sql = `DELETE FROM player WHERE Player_ID = ${player_id}`;
  connection.query(sql, (error, rows) => {
    if (error) throw error;
    res.redirect("/player");
  });
});

//render useful queries page
app.get("/usefulQueries", (req, res) => {
  res.render("usefulQueries/usefulQueries");
});

//Useful Queries
app.post('/bestTeams', function(req, res) {
  connection.query('SELECT Team_name, Wins FROM team ORDER BY Wins DESC;', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/bestTeams", {rows});
    }
  })
})

app.post('/bestPlayers', function(req, res) {
  connection.query('SELECT First_name, Last_name, Points_scored, Team_name FROM player P JOIN team T ON P.Team_id = T.Team_id WHERE Points_scored IN (SELECT MAX(Points_scored) FROM player P JOIN team T ON P.Team_id = T.Team_id GROUP BY Team_name);', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/bestPlayers", {rows});
    }
  })
})

app.post('/over10000', function(req, res) {
  connection.query('SELECT Team_name FROM team T JOIN player P ON P.Team_id = T.Team_id WHERE Points_scored > 10000 GROUP BY Team_name;', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/over10000", {rows});
    }
  })
})

app.post('/worstFT', function(req, res) {
  connection.query('SELECT Team_name, FT_rate FROM team ORDER BY FT_rate ASC LIMIT 1;', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/worstFT", {rows});
    }
  })
})

app.post('/coachWins', function(req, res) {
  connection.query('SELECT First_name, Last_name, C.Wins, Team_name FROM coach C JOIN team T ON C.Coach_id = T.Coach_id ORDER BY C.Wins DESC LIMIT 10;', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/coachWins", {rows});
    }
  })
})

app.post('/coachChampionships', function(req, res) {
  connection.query('SELECT First_name, Last_name, Championships FROM coach C JOIN team T ON C.Coach_id = T.Coach_id WHERE Championships > 1 ORDER BY Championships DESC;', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/coachChampionships", {rows});
    }
  })
})

app.post('/coachesInLA', function(req, res) {
  connection.query('SELECT First_name, Last_name, Team_name FROM coach C JOIN team T ON C.Coach_id = T.Coach_id WHERE City = "LA";', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/coachesInLA", {rows});
    }
  })
})

app.post('/coachesOwners2Championships', function(req, res) {
  connection.query('SELECT Owner_first_name, Owner_last_name, First_name, Last_name, Team_Name FROM coach C JOIN team T ON C.Coach_id = T.Coach_id JOIN owner O ON T.Owner_id = O.Owner_id WHERE C.Championships >= 2 AND O.Championships >= 2 AND C.Win_percentage > 0.60 AND O.Win_percentage > 0.60;', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/coachesOwners2Championships", {rows});
    }
  })
})

app.post('/coachesOwnersMinWinPer', function(req, res) {
  connection.query('SELECT Owner_first_name, Owner_last_name, First_name, Last_name, Team_name, O.Win_percentage AS "OwnerWins", C.Win_percentage FROM coach C JOIN team T ON C.Coach_id = T.Coach_id JOIN owner O ON T.Owner_id = O.Owner_id WHERE C.Win_percentage IN (SELECT MIN(Win_percentage) FROM coach);', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/coachesOwnersMinWinPer", {rows});
    }
  })
})

app.post('/teamsInCA', function(req, res) {
  connection.query('SELECT Team_name FROM team WHERE City in ("LA", "San Francisco", "Sacramento");', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/teamsInCA", {rows});
    }
  })
})

app.post('/rocketsOwner', function(req, res) {
  connection.query('SELECT Owner_first_name, Owner_last_name FROM owner O JOIN team T ON O.Owner_id = T.Owner_id WHERE Team_name = "Rockets";', (error, rows) => {
    if(error) throw error;
    if(!error) {
      console.log(rows);
      res.render("usefulQueries/rocketsOwner", {rows});
    }
  })
})

app.listen(port);
console.log(`Server is listening on port ${port}`);
