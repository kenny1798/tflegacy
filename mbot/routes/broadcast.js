const express = require('express');
const router = express.Router();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const {phoneNumberFormatter} = require('../middlewares/WhatsAppFormatter');
const path = require('path');
const fs = require('fs');
const fsx = require('fs-extra');
const xlsx = require("xlsx");
const {mbot_flow, mbot_flowblock, mbot_campaign} = require('../models')
const multer = require('multer');
const { validateToken } = require('../middlewares/AuthMiddleware');
require('dotenv').config();

const storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, './dbexcel')
    },
    filename: (req, file, cb) =>{
        cb(null,"mbot_" + Date.now() + path.extname(file.originalname))
    }

});

const limitFileSize = 7 * 1024 * 1024

var upload = multer({storage: storage});

const storage1 = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, 'flowmedia')
    },
    filename: (req, file, cb) =>{
        cb(null,"mbot_" + Date.now() + path.extname(file.originalname))
    }

});

var upload1 = multer({storage: storage1,
    limits: {fileSize:limitFileSize}, 
    fileFilter:(req, file, cb) => {
        if(file.mimetype == 'image/jpeg' || file.mimetype == 'image/jpg' || file.mimetype == 'image/png' || file.mimetype == 'video/mp4'){
            cb(null,true)
        }else{
            cb(null, false)
            return cb(new Error('Only .jpg, .jpeg, .png and .mp4 files are allowed'))
        }
    }});

router.get('/get/flow/:id', validateToken, async (req,res) => {
    try{
        const id = req.params.id;
        const flow = await mbot_flow.findOne({where:{id:id}})
        const flowName = await flow.flowName;
        const blocks = await mbot_flowblock.findAll({where:{flowName:flowName}})
        res.json(blocks);
        

    }catch(err){

    }
})

router.get('/get/flowname/:id', validateToken, async (req,res) => {
    try{
        const id = req.params.id;
        const flow = await mbot_flow.findOne({where:{id:id}})
        const flowName = await flow.flowName;
        res.json(flowName);
        

    }catch(err){

    }
})

router.get('/get/flowname/', validateToken, async (req,res) => {
    try{
        const username = req.user.username;
        const flow = await mbot_flow.findAll({where:{username:username}})
        res.json(flow);
    }catch(err){

    }
})

router.get('/get/campaign/', validateToken, async (req,res) => {
    try{
        const username = req.user.username;
        const campaign = await mbot_campaign.findAll({where:{username:username}})
        res.json(campaign);
    }catch(err){

    }
})

router.post('/create/flow/block', validateToken, upload1.single('content'), async (req,res) => {
// try{
    const username = req.user.username;
    const flowName = req.body.flowName;
    const contentType = req.body.contentType;
    const isDelay = req.body.isDelay;
    const parsedIsDelay = parseInt(isDelay, 10);
    const delayPeriod = req.body.delayPeriod;
    const parsedDelayPeriod = parseInt(delayPeriod, 10);
    if(contentType == 'Text'){
        const content = req.body.content;
        await mbot_flowblock.create({
            username:username,
            flowName: flowName,
            contentType: contentType,
            content: content,
            isDelay: parsedIsDelay,
            delayPeriod: parsedDelayPeriod
        }).then(() => {
                res.status(201).json({
                    message: 'Block created successfully',
                    flow: flowName
                })
            console.log(parsedDelayPeriod);
            console.log(content);
            })
    }else if(contentType == 'Image' | contentType == 'Video'){
        const content = req.file.filename;
        console.log(content)
        await mbot_flowblock.create({
            username:username,
            flowName: flowName,
            contentType: contentType,
            content: content,
            isDelay: parsedIsDelay,
            delayPeriod: parsedDelayPeriod
        }).then(() => {
                res.status(201).json({
                    message: 'Block created successfully',
                    flow: flowName
                })
            })
    }else{
        res.status(404).json({error: 'Unknown file type'})
    }
    // }
    
    // }catch(error){
    //     res.status(404).json({error: error})
    // }
})

router.post('/create/flow', validateToken, async(req,res) => {
    const username = req.user.username;
    const flowName = req.body.flowName;
    const dupeFlowName = await mbot_flow.findOne({where:{username:username, flowName:flowName}});
    if(dupeFlowName){
        res.status(403).json({error: "Flow Name already existed"})
    }else{
        await mbot_flow.create({
            username:username,
            flowName:flowName
        }).then(async () => {
            const getData = await mbot_flow.findOne({where:{username:username, flowName:flowName}});
            const id = getData.id;
            res.status(201).json({
                message: 'Flow created successfully',
                flow: flowName,
                id: id
            })
        })
    }
})

router.post('/create/campaign/', upload.single('excelFile'), validateToken, async (req,res) => {
    try{

        if(req.file.filename == null || req.file.filename == 'undefined'){
            res.status(400).json("No file");
        }else{
        console.log(req.file.filename)
        const filePath = './dbexcel/' + req.file.filename;
        const wb = xlsx.readFile(filePath);
        const sheetName_list = wb.SheetNames;
        let count = [];
        for (var sheetIndex = 0; sheetIndex < sheetName_list.length; sheetIndex++){
            var worksheet = wb.Sheets[sheetName_list[sheetIndex]];
            var range = xlsx.utils.decode_range(worksheet['!ref']);
            var num_rows = range.e.r - range.s.r;
        }
        count.push({
            data_count: num_rows
        })
        const username = req.user.username;
        const {campaignName, inputContent, is_Schedule, msgInterval, scheduleDate} = req.body;
        const parsedSchedule = parseInt(is_Schedule, 10);
        const parsedInterval = parseInt(msgInterval, 10);
        const totalContacts = num_rows + 1;
        const dupeCampaign = await mbot_campaign.findOne({where:{username:username, campaignName:campaignName}})
        const allContent = await mbot_flowblock.findAll({where: {flowName:inputContent}});
        const delayTotal = allContent.reduce(function(t, value){
            return t + value.delayPeriod
        }, 0)

        if(dupeCampaign){
            res.status(201).json({error: "Campaign Name existed"})
        }else{
            await mbot_campaign.create({
                username: username,
                campaignName: campaignName,
                content: inputContent,
                msgInterval: parsedInterval,
                totalContacts: totalContacts,
                msgSent: 0,
                campaignStatus: 'Running',
                waSession: `session-${username}`,
                is_Schedule: parsedSchedule,
                scheduleDate: scheduleDate
            }).then(()=> {
                const sheetValues = wb.Sheets[sheetName_list];
                const excelData = xlsx.utils.sheet_to_json(sheetValues, {header: 1});
                const phonenumberList = excelData.reduce((r, e) => (r.push(...e), r));
                    if(is_Schedule == 1){
                        const scheduledPeriod = new Date(scheduleDate) - Date.now();
                        console.log(scheduledPeriod)
                        const scheduledCampaign = () => {
                            const client = new Client({
                                authStrategy: new LocalAuth({clientId: username}),
                                puppeteer: {headless: true,
                                args: [ '--disable-gpu',
                                 '--disable-setuid-sandbox',
                                 '--no-sandbox'],
                                 executablePath: process.env.EXECUTE_PATH}
                                        });
    
                            client.initialize();
    
                            client.on('ready', () => {
                                for (var i = 0; i < phonenumberList.length; i++){
                                    const list = phonenumberList[i];
                                    const formattedList = phoneNumberFormatter(JSON.stringify(list));
                                        for (var j = 0; j < allContent.length; j++){                                       
                                                const singleContent = allContent[j];
                                                const singleContentType = singleContent.contentType;
                                                const singleContentContent = singleContent.content;
                                                const singleContentisDelay = singleContent.isDelay;
                                                const singleContentDelayPeriod = singleContent.delayPeriod;
                                        if(singleContentType == 'Text'){
                                                    const sendTextMsg = () => {
                                                        try{
                                                            client.sendMessage(formattedList, singleContentContent).then(async () => {                                          
                                                                console.log('A text message was sent to ' + list)
                                                            })
                                                        }catch(error){
                                                            console.log(error)
                                                        }             
                                                    }
                                                    if(singleContentisDelay == true){
                                                        const delay = (parsedInterval * (i+1) * 1000) + (singleContentDelayPeriod * 1000)
                                                        setTimeout(sendTextMsg, delay)
                                                    }else{
                                                        const delay = parsedInterval * (i+1) * 1000
                                                        setTimeout(sendTextMsg, delay)
                                                    }          
                                                }
                                        else if(singleContentType == 'Image' | singleContentType == 'Video'){
                                            
                                                    const sendTextMsg = () => {
                                                        try{
                                                        const media = MessageMedia.fromFilePath(`./flowmedia/${singleContentContent}`)
                                                        client.sendMessage(formattedList, media).then(async () => {                                          
                                                            console.log('A media message was sent to ' + list)
                                                        })
                                                        }catch(error){
                                                            console.log(error)
                                                        }                                                                
                                                    }
                                                    if(singleContentisDelay == true){
                                                        const delay = (parsedInterval * (i+1) * 1000) + (singleContentDelayPeriod * 1000)
                                                        setTimeout(sendTextMsg, delay)
                                                    }else{
                                                        const delay = parsedInterval * (i+1) * 1000
                                                        setTimeout(sendTextMsg, delay)
                                                    }          
                                                }
                                                
                                            }
                                            const sendTextContact = async () => {
                                                const currentData = await mbot_campaign.findOne({where: {username:username,campaignName:campaignName}})
                                                const currentMsgSent = currentData.msgSent;
                                                const addMsgSent = currentMsgSent + 1;
                                                await mbot_campaign.update({msgSent:addMsgSent}, {where: {username:username, campaignName:campaignName}})
                                                    }
                                            const sentMsgUpdateDelay = (parsedInterval * (i+1) * 1000) + ((delayTotal + 1) * 1000);
                                            console.log(sentMsgUpdateDelay);
                                            setTimeout(sendTextContact, sentMsgUpdateDelay);
                                            
                                        }        
                            })
                        }
    
                    setTimeout(scheduledCampaign, scheduledPeriod)
                    }else{
                            const client = new Client({
                                authStrategy: new LocalAuth({clientId: username}),
                                puppeteer: {headless: true,
                                args: [ '--disable-gpu',
                                 '--disable-setuid-sandbox',
                                 '--no-sandbox'],
                                 executablePath: process.env.EXECUTE_PATH}
                                        });
    
                            client.initialize();
    
                            client.on('ready', () => {
                                for (var i = 0; i < phonenumberList.length; i++){
                                    const list = phonenumberList[i];
                                    const formattedList = phoneNumberFormatter(JSON.stringify(list));
                                        for (var j = 0; j < allContent.length; j++){                                       
                                                const singleContent = allContent[j];
                                                const singleContentType = singleContent.contentType;
                                                const singleContentContent = singleContent.content;
                                                const singleContentisDelay = singleContent.isDelay;
                                                const singleContentDelayPeriod = singleContent.delayPeriod;
                                        if(singleContentType == 'Text'){
                                                    const sendTextMsg = () => {
                                                        try{
                                                            client.sendMessage(formattedList, singleContentContent).then(async () => {                                          
                                                                console.log('A text message was sent to ' + list)
                                                            })
                                                        }catch(error){
                                                            console.log(error)
                                                        }
                                                        
                                                    }
                                                    if(singleContentisDelay == true){
                                                        const delay = (parsedInterval * (i+1) * 1000) + (singleContentDelayPeriod * 1000)
                                                        setTimeout(sendTextMsg, delay)
                                                    }else{
                                                        const delay = parsedInterval * (i+1) * 1000
                                                        setTimeout(sendTextMsg, delay)
                                                    }          
                                                }
                                        else if(singleContentType == 'Image' | singleContentType == 'Video'){
                                                    const sendTextMsg = () => {
                                                        try{
                                                            const media = MessageMedia.fromFilePath(`./flowmedia/${singleContentContent}`)
                                                            client.sendMessage(formattedList, media).then(async () => {                                          
                                                                console.log('A media message was sent to ' + list)
                                                            })
                                                            }catch(error){
                                                                console.log(error)
                                                            }
                                                        
                                                    }
                                                    if(singleContentisDelay == true){
                                                        const delay = (parsedInterval * (i+1) * 1000) + (singleContentDelayPeriod * 1000)
                                                        setTimeout(sendTextMsg, delay)
                                                    }else{
                                                        const delay = parsedInterval * (i+1) * 1000
                                                        setTimeout(sendTextMsg, delay)
                                                    }          
                                                }
                                                
                                            }
                                            const sendTextContact = async () => {
                                                const currentData = await mbot_campaign.findOne({where: {username:username,campaignName:campaignName}})
                                                const currentMsgSent = currentData.msgSent;
                                                const addMsgSent = currentMsgSent + 1;
                                                await mbot_campaign.update({msgSent:addMsgSent}, {where: {username:username, campaignName:campaignName}}).then( async () => {
                                                const totalContact = currentData.totalContacts;
                                                const sentMsg = currentData.msgSent + 1;
                                                console.log(sentMsg)
                                                console.log(totalContact)
                                                    if(sentMsg == totalContact){
                                                        const finishingCampaign = async () => {
                                                        client.destroy();
                                                        fs.rmSync(filePath, {recursive: true});
                                                        await mbot_campaign.update({campaignStatus:'Finished'}, {where: {username:username, campaignName:campaignName}})
                                                        }
                                                        setTimeout(finishingCampaign, 5000)
                                                    }
                                                })
                                                
                                                    }
                                            const sentMsgUpdateDelay = (parsedInterval * (i+1) * 1000) + ((delayTotal + 1) * 1000);
                                            console.log(sentMsgUpdateDelay);
                                            setTimeout(sendTextContact, sentMsgUpdateDelay);
                                        }        
                            })
                    }
                
            })
        }      
    }

    }catch(error){
        res.status(400).json({error: error})
    }
})

module.exports = router;