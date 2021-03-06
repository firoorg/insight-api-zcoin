const request = require('request');
const pgp = require('pg-promise')();

class LelantusStatusController {

  constructor(options) {
    this.node = options.node;
    this.connection_params = options.connection_params;
    this.block_height = 0;
  }

  getStatus(req, res) {
    var db = pgp(this.connection_params);

    var jsplit_sql = `
      select lb, ub, coalesce(sum(i.value_sat)/1e+8, 0) tot, count(i.value_sat) cnt
      from (values(0,9),(9,11),(11,44), (44,56),(56,94),(94,106),(106,194),(194,206),(206,494),(494,506),(506,994),(994,1006),(1006,3994),(3994,6006),(6006,23994)) as r(lb, ub)
      left join (select i.value_sat from vin i
        join address a on i.address_uid = a.uid
        join address_single sa on a.uid = sa.address_uid and sa.address_hash_uid = 8) i
      on i.value_sat >= r.lb * 1e+8 and i.value_sat < r.ub * 1e+8
      group by r.lb, r.ub order by r.lb;
    `;

    db.query(jsplit_sql)
      .then(jsplit_data => {
        var mint_sql = `
          select r.lb, r.ub, coalesce(sum(o.value_sat)/1e+8, 0) tot, count(o.value_sat) cnt
          from (values(0,9),(9,11),(11,44), (44,56),(56,94),(94,106),(106,194),(194,206),(206,494),(494,506),(506,994),(994,1006),(1006,3994),(3994,6006),(6006,23994)) as r(lb, ub)
          left join (select o.value_sat from vout o
            join address a on o.address_uid = a.uid
            join address_single sa on a.uid = sa.address_uid and sa.address_hash_uid = 6) o
          on o.value_sat >= r.lb * 1e+8 and o.value_sat < r.ub * 1e+8
          group by r.lb, r.ub order by r.lb;
        `;

        db.query(mint_sql)
          .then(mint_data => {
            this.jsplits = jsplit_data;
            this.mints = mint_data;
            var data = {};
            data.jsplits = jsplit_data;
            data.mints = mint_data;
            res.jsonp(data);

          })
          .catch(error => {
            console.log(error);
          });
      })
      .catch(error => {
        console.log(error);
      });
  }
}

module.exports = LelantusStatusController;

