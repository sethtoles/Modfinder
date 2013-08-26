var	_ = require('underscore')
,	mysql = require('mysql')
,	connection = mysql.createConnection({
	host:'[omitted]',
	port:[omitted],
	user:'[omitted]',
	password:'[omitted]',
	database:'[omitted]',
	multipleStatements:'true'
});
var numMatches = 0;
connection.query("SELECT * FROM `user` WHERE `numResponses` > 5; SELECT * FROM `questionresponse`; SELECT * FROM `acceptableresponse`;",function(err,results){
	//connection.destroy();
	if(err){
		console.log(err);
		//connection.destroy();
		return false;
	}

	process.on("exit",function() {
		connection.destroy();
	});

	var users = results[0];
	_.each(users,function(user){
		user.responses = _.where(results[1], {userID:user.userID});
		user.acceptable = _.where(results[2], {userID:user.userID});
	});
	_.each(users,function(i) {
		var userMatches = 0;
		console.log("-----------",i.name,"----------");
		_.each(users,function(j) {
			if(i.userID === j.userID)
				return false;
			var overlap = _.intersection(
							_.pluck(i.responses, "questionID"),
							_.pluck(j.responses, "questionID")
						);
			
			if(overlap.length > 6) {
				var points = 0;
				var possible = 0;
				_.each(overlap,function(questionID) {
					var importance = _.where(i.responses, {questionID:questionID})[0].importance;
					possible += importance;
					if(_.contains(
						_.pluck(_.where(i.acceptable, {questionID:questionID}), "answerID"),
						_.where(j.responses, {questionID:questionID})[0].answerID)) {
						points += importance;
					} else {
						points -= importance;
					}
				});
				if(possible !== 0){
					userMatches++;
					numMatches++;
					connection.query(
						"DELETE FROM `match` WHERE `userID` = ? AND `mUserID` = ? LIMIT 1; \
						INSERT LOW_PRIORITY INTO `match` (`userID`,`mUserID`,`match`,`base`) VALUES (?,?,?,?);",
						[
							i.userID, j.userID,
							i.userID,j.userID,(points + possible) / (possible * 2),overlap.length
						],
						console.log
					);
					var match =  parseInt(((points + possible) / (possible * 2)) * 100);
					console.log("===>",i.name + " : " + j.name + " : " + match + "%, based on " + overlap.length);
				}
			}
		});
		connection.query("UPDATE LOW_PRIORITY `user` SET `numMatches` = ? WHERE `userID` = ?",[userMatches,i.userID],console.log);
		console.log(userMatches," total matches.");
	});
console.log(numMatches);

});