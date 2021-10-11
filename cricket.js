
// node cricket.js --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results" --dest=teams1.csv --destPdf=World-Cup

let minimist = require("minimist")
let axios = require("axios")
let jsdom = require("jsdom")
let excel = require("excel4node")
let pdf = require("pdf-lib")
let fs = require("fs")
const { match } = require("assert")
let args = minimist(process.argv)
let path = require("path")

let respnseKaPromise = axios.get(args.source)
let wb = new excel.Workbook();
respnseKaPromise.then((response) => {
    let html = response.data
    let dom = new jsdom.JSDOM(html) 
    let document = dom.window.document; 
    
    let matches = [];
    let matchScoreDivs = document.querySelectorAll("div.match-score-block");
    allMatches(matches , matchScoreDivs)   //gets all matches in matches array
    
    let matchesJSON = JSON.stringify(matches)
    fs.writeFileSync("matches.json", matchesJSON, "utf-8")
    
    let teams = []
    allTeams(teams, matches) // gets all teams in object and an empty matches="" array is assigned

    for(let i=0; i<matches.length;i++){
        teamMatches(teams, matches[i]);   // filling matches array inside teams 
    }
    
    // to save JSO we stringigy it to JSON
    let teamsJSON = JSON.stringify(teams)
    fs.writeFileSync("teamsJSON.js", teamsJSON, "utf-8")
    

    // writing excel
    var wb = new excel.Workbook();
    for(let i=0;i<teams.length;i++){
        let sheet = wb.addWorksheet(teams[i].name)
        sheet.cell(1,1).string("Against")
        sheet.cell(1,2).string("selfScore")
        sheet.cell(1,3).string("OppScore")
        sheet.cell(1,4).string("Result")
        for(let j=0;j<teams[i].matches.length;j++){
            sheet.cell(2+j,1).string(teams[i].matches[j].vs)
            sheet.cell(2+j,2).string(teams[i].matches[j].selfScore)
            sheet.cell(2+j,3).string(teams[i].matches[j].oppScore)
            sheet.cell(2+j,4).string(teams[i].matches[j].result)
        }
    }
    wb.write(args.dest);


    // folder creation pdf
    if(!fs. existsSync(args.destPdf))
        fs.mkdirSync(args.destPdf)
    for(let i=0; i<teams.length;i++){
        let teamFN = path.join(args.destPdf , teams[i].name);
        if(!fs.existsSync(teamFN))
            fs.mkdirSync(teamFN);

        for(let j=0;j <teams[i].matches.length;j++){
            let matchFileName = path.join(teamFN , teams[i].matches[j].vs )
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
})
function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;

    let templateBytes = fs.readFileSync("Template.pdf");
    let pdfdocP = pdf.PDFDocument.load(templateBytes);
    pdfdocP.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 320,
            y: 729,
            size: 8
        });
        page.drawText(t2, {
            x: 320,
            y: 715,
            size: 8
        });
        page.drawText(t1s, {
            x: 320,
            y: 701,
            size: 8
        });
        page.drawText(t2s, {
            x: 320,
            y: 687,
            size: 8
        });
        page.drawText(result, {
            x: 320,
            y: 673,
            size: 8
        });

        let finalPDFBytes = pdfdoc.save();
        finalPDFBytes.then(function(finalPDFBytes){
            if(!fs.existsSync(matchFileName +".pdf"))
                fs.writeFileSync(matchFileName +".pdf", finalPDFBytes);
            else{
                let count=1;
                while(true){
                    if(fs.existsSync(matchFileName+count +".pdf"))
                        count++;
                    else
                        break;
                }
                fs.writeFileSync(matchFileName+ count +".pdf", finalPDFBytes);
            }
        })
    })
}



function allTeams( teams ,matches){
    for(let i=0;i<matches.length;i++){
        let t1 = matches[i].t1;
        let t2 = matches[i].t2;
        
        let t1Index = -1;
        for(let j=0; j<teams.length;j++){
            if(teams[j].name == matches[i].t1){
                t1Index=j;
                break;
            }
        }
        if(t1Index==-1){
            teams.push({
                name: matches[i].t1,
                matches:[]
            })
        }

        let t2Index = -1;
        for(let j=0; j<teams.length;j++){
            if(teams[j].name == matches[i].t2){
                t2Index=j;
                break;
            }
        }
        if(t2Index==-1){
            teams.push({
                name: matches[i].t2,
                matches:[]
            })
        }

    }
}

function teamMatches(teams, match){
    let t1Index=-1;
    for(let i=0; i<teams.length;i++){
        if(teams[i].name==match.t1){
            t1Index = i;
            break;
        }
    }
    teams[t1Index].matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    })

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });


}


function allMatches(matches,matchScoreDivs ){
    for(let i=0; i<matchScoreDivs.length;i++){

        let match ={
        }
        let teamName = matchScoreDivs[i].querySelectorAll("p.name")
        match.t1 = teamName[0].textContent
        match.t2 = teamName[1].textContent
        
        let teamScore = matchScoreDivs[i].querySelectorAll("span.score")
        if(teamScore[0]!=null && teamScore[1]!=null){
            match.t1s = teamScore[0].textContent
            match.t2s = teamScore[1].textContent
        }
        if(teamScore[0]!=null && teamScore[1]==null){
            match.t1s = teamScore[0].textContent
            match.t2s = ""
        }
        if(teamScore[0]==null && teamScore[1]!=null){
            match.t1s = ""
            match.t2s = teamScore[1].textContent
        }
        if(teamScore[0]==null && teamScore[1]==null){
            match.t1s = ""
            match.t2s = ""
        }
        let res = matchScoreDivs[i].querySelector("div.status-text > span")
        match.result = res.textContent;
        matches.push(match)
        // let sheet = wb.addWorksheet("VAIBHAV");
    // sheet.cell(1,1).string("Opponet")
    // wb.write(args.dest);
    }
}