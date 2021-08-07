var express = require('express');
var router = express.Router();

router.use(express.urlencoded({
  extended: true
}))

//get db connection
const { Pool, Client } = require('pg')
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dbdResultLog',
  password: 'b7654321',
  port: 5432,
})

//get map list
let map_lst = [];
let sel_text_map = "SELECT map.id, map_name, count(map) FROM map LEFT JOIN result ON map.id=result.map GROUP BY map.id ORDER BY count(result.map) desc;";
pool.query(sel_text_map, (err, res) => {
  map_lst = res["rows"];
})

let killer_lst = [];
let sel_text_kil = "SELECT killer_name.id, killer_name.killer_name, count(killer.killer_name) FROM killer_name LEFT JOIN killer ON killer_name.id=killer.killer_name GROUP BY killer_name.id ORDER BY count(killer.killer_name) desc;";
pool.query(sel_text_kil, (err, res) => {
  killer_lst = res["rows"];
})

let killer_perk_lst = [];
let sel_text_kil_perk = "SELECT killer_perk.id, killer_perk.perk, count(*) FROM killer_perk LEFT JOIN killer ON killer_perk.id=killer.perk_1 OR killer_perk.id=killer.perk_2 OR killer_perk.id=killer.perk_3 OR killer_perk.id=killer.perk_4 WHERE killer_perk.id NOT IN (-1) GROUP BY killer_perk.id ORDER BY count(*) desc;";
pool.query(sel_text_kil_perk, (err, res) => {
  killer_perk_lst = res["rows"];
})

let surviver_perk_lst = [];
let sel_text_sur_perk = "SELECT surviver_perk.id, surviver_perk.perk, count(*) FROM surviver_perk LEFT JOIN surviver ON surviver_perk.id=surviver.perk_1 OR surviver_perk.id=surviver.perk_2 OR surviver_perk.id=surviver.perk_3 OR surviver_perk.id=surviver.perk_4 WHERE surviver_perk.id NOT IN (-1) GROUP BY surviver_perk.id ORDER BY count(*) desc;";
pool.query(sel_text_sur_perk, (err, res) => {
  surviver_perk_lst = res["rows"];
})

function ins_killer(killer_id, kpc) {
  const insertText_killer = "INSERT INTO killer VALUES(DEFAULT, $1, $2, $3, $4, $5) RETURNING id;";
  while (kpc.length != 4) {
    kpc.push(-1);
  }
  var val = [killer_id, kpc[0], kpc[1], kpc[2], kpc[3]];
  const res = pool.query(insertText_killer, val);
  return res;
}

function ins_surviver(spc) {
  while (spc.length != 4) {
    spc.push(-1);
  }
  var insertText = "INSERT INTO surviver VALUES(DEFAULT, $1, $2, $3, $4) RETURNING id;";
  const res = pool.query(insertText, spc);
  return res;
}

function ins_party(surviver_id_lst) {
  const insertText_party = "INSERT INTO party VALUES(DEFAULT, $1, $2, $3, $4) RETURNING id;"
  const res = pool.query(insertText_party, surviver_id_lst);
  return res;
}

async function ins_result(killer, kpc, spc_lst, values) {
  const insertText = "INSERT INTO result(\
    result, rem_gen, map, killer, party) \
  VALUES ($1, $2, $3, $4, $5);"

  const killer_id = await ins_killer(killer, kpc);
  values.push(killer_id.rows[0]["id"]);

  var surviver_id_lst = []
  var len = spc_lst.length;
  for (let i = 0; i < len; i++) {
    const surviver_id = await ins_surviver(spc_lst[i]);
    surviver_id_lst.push(surviver_id.rows[0]["id"]);
  }

  var party_id = await ins_party(surviver_id_lst);

  values.push(party_id.rows[0]["id"]);

  pool.query(insertText, values);
}

//checkbox farming
function checkToAry(cbox) {
  if (cbox == null) {
    cbox = []
  }
  else if (Array.isArray(cbox) == false) {
    cbox = [cbox];
  }

  if (cbox.length > 4) {
    cbox = cbox.slice(0, 4);
  }
  return cbox;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  delete killer_perk_lst[0][-1]
  res.render('index', { title: 'DBD RESULT LOG', map: map_lst, killer: killer_lst, killer_perk: killer_perk_lst, surviver_perk: surviver_perk_lst });
});

router.post('/submit-form', (req, res) => {

  var result;
  switch (req.body.result) {
    case "win":
      result = true;
      break;

    case "defeat":
      result = false;
      break;
  }

  const rem_gen = req.body.rem_gen;
  const map = req.body.map;

  //killer
  const killer = req.body.killer;
  var kpc = checkToAry(req.body.killer_perk_check);

  //surviver
  const spc1 = checkToAry(req.body.surviver_perk_check1);
  const spc2 = checkToAry(req.body.surviver_perk_check2);
  const spc3 = checkToAry(req.body.surviver_perk_check3);
  const spc4 = checkToAry(req.body.surviver_perk_check4);
  var spc_lst = [spc1, spc2, spc3, spc4]

  ins_result(killer, kpc, spc_lst, [result, rem_gen, map]);
  
  /*
  pool.query('SELECT * FROM result;', (err, res) => {
    console.log(res["rows"])
  })
  */
  res.render('index', { title: 'DBD RESULT LOG', map: map_lst, killer: killer_lst, killer_perk: killer_perk_lst, surviver_perk: surviver_perk_lst });
})

module.exports = router;
