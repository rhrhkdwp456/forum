// 밑에 2줄은 express 라이브러리 사용하겠다는 뜻.
const express = require('express')
const app = express()

// mongodb 셋팅
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
//bcrypt 라이브러리 셋팅
const bcrypt = require('bcrypt')


// passport 라이브러리 셋팅 시작
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

// connect-mongo 라이브러리 셋팅
const MongoStore = require('connect-mongo') 
const e = require('express')

app.use(passport.initialize())
app.use(session({
  secret: '암호화에 쓸 비번', // 세션의 document id는 암호화해서 유저에게 보냄
  resave : false, // 유저가 서버로 요청할 때마다 세션 갱신할건지(보통은 false함.)
  saveUninitialized : false, // 로그인 안해도 세션 만들것인지(보통 false)
  cookie : { maxAge : 60 * 60 * 1000 } ,// 세션 document 유효기간 변경 하는 코드(60*1000 -> 60초, 60*60*1000 -> 1시간)
  store : MongoStore.create({
    mongoUrl : 'mongodb+srv://admin:rhkdwp3419@cluster0.s7bziya.mongodb.net/?retryWrites=true&w=majority',
    dbName : 'forum'
  })
}))

app.use(passport.session()) 
// passport 라이브러리 셋팅 끝.

app.use(methodOverride('_method'))
// 폴더를 server.js에 등록해두면 폴더안의 파일들 html에서 사용 가능.
app.use(express.static(__dirname +'/public'))

//ejs 셋팅 하는 코드
app.set('view engine', 'ejs')
// html 파일에 데이터를 넣고 싶으면 .ejs 파일로 만들어야 가능.
// ejs파일은 꼭 views라는 폴더를 만들어서 생성.

// 요청.body 쓰러면 필수적으로 작성해야 됨.
app.use(express.json())
app.use(express.urlencoded({extended:true})) 


// MongoDB 연결하기 위해 하는 셋팅


let db
const url = 'mongodb+srv://admin:rhkdwp3419@cluster0.s7bziya.mongodb.net/?retryWrites=true&w=majority'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
  app.listen(8080, () => {
        console.log('http://localhost:8080 에서 실행 중')
    })
}).catch((err)=>{
  console.log(err)
})




// 서버 띄우는 코드
// app.listen(8080, () => {
//     console.log('http://localhost:8080 에서 실행 중')
// })

// 간단한 서버 기능 -> 누가 메인페이지 접속시 html 파일 보내주기.
app.get('/', (요청, 응답)=>{
    응답.sendFile(__dirname+'/index.html')
})

// /news로 접속 했을 때 html 파일 보내 주는 방법.
// __dirname -> 현재 프로젝트 절대 경로 의미.(server.js가 담긴 폴더)

app.get('/home', async(요청,응답)=>{
    응답.sendFile(__dirname + '/index.html')
})


app.get('/introduce', (요청, 응답)=>{
    응답.sendFile(__dirname+'/introduce.html')
})

// await -> 바로 다음줄 실행하지말고 잠깐 기다려주세요
// 자바스크립트는 처리가 오래 걸리는 코든는 처리완료 기다리지 않고 다음줄 실행함. 그래서 await 써줘야됨.



// DB에 post요청 받았을 때 데이터 넣는 방법.
app.post('/add', async (요청, 응답) => {
    await db.collection('post').insertOne({ title : 요청.body.title, content : 요청.body.content })
    응답.redirect('/list')
})

app.get('/detail/:id', async (요청, 응답) => {
    

    try{
        let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })
        응답.render('detail.ejs', { result : result })
        if(result == null){
            응답.status(404).send('이상한 url 입력함.') 
        }
    } catch(e){
        console.log(e)
        응답.status(404).send('이상한 url 입력함.') 
        // 400 -> 유저 오류 500 -> 서버오류
    }
})


app.get('/edit/:id', async(요청, 응답)=>{
    let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })  
    응답.render('edit.ejs', { result : result })
})


app.put('/edit', async (요청, 응답) => {

    try{
        let result = await db.collection('post').updateOne({ _id : new ObjectId(요청.body.id)},
        {$set : { title : 요청.body.title, content : 요청.body.content}
        })
        응답.redirect('/list')
        console.log(result.matchedCount)
    }catch(e){
        console.log(e)
        응답.status(404).send('이상한 url 입력함.') 
    }
})

// await db.collection('post').updateOne({ _id : 1 }, {$inc : {like : 2}}) // inc -> 값을 + - 하는 문법


    // 동시에 여러개 document 수정 하는방법.
    // await db.collection('post').updateMany({ _id : 1 }, {$inc : {like : 2}})

    // like 항목이 10 이상인 document 전부 수정 하는 방법
    // await db.collection('post').updateMany({ like : {$gt :10} }, {$inc : {like : 2}}) 
    // $gt : 10 -> like 항목이 10 이상인가 $lt는 이하 $ne는 not 효과


app.delete('/delete', async(요청, 응답)=>{
    
    console.log(요청.query)
    
    await db.collection('post').deleteOne({ _id : new ObjectId(요청.query.docid)})
    응답.send('삭제완료')
    
})

app.get('/list/:id', async(요청, 응답)=>{
    // 1번 ~ 5번글을 찾아서 result변수에 저장.
    let result = await db.collection('post').find().skip((요청.params.id-1)*5).limit(5).toArray()// 컬렉션의 모든 document 출력 하는 법.
    응답.render('list.ejs', { posts : result })
})

app.get('/list/next/:id', async(요청, 응답)=>{
    // 1번 ~ 5번글을 찾아서 result변수에 저장.
    let result = await db.collection('post').find({_id : {$gt : new ObjectId(요청.params.id)}}).limit(5).toArray()// 컬렉션의 모든 document 출력 하는 법.
    응답.render('list.ejs', { posts : result })
})


// 세션 데이터를 DB에 저장하려면 connect-mongo 라이브러리 설치
// npm install bcrypt -> 해슁을 하기 위해서 사용하는 라이브러리 bcrypt 설치

// 필요한 라이브러리 npm install express-session passport passport-local 
// passport는 회원인증 도와주는 메인라이브러리,
// passport-local은 아이디/비번 방식 회원인증쓸 때 쓰는 라이브러리
// express-session은 세션 만드는거 도와주는 라이브러리입니다.

// passport 라이브러리 사용하면 session 방식 기능 구현할 때 간단함.
// session 방식
// 1. 가입 기능
// 2. 로그인 기능
// 3. 로그인 완료시 세션만들기(어떤 유저가 언제 로그인했고 유효기간은~까지다.)
// passport.serializeUser() 함수 사용하면 세션 만들어줌.
// 4. 로그인 완료시 유저에게 입장권 보내줌.
// 5. 로그인 여부 확인하고 싶으면 입장권 까봄.

// 가입기능


// 제출한 아이디 비번이 DB에 있는지 확인하고
// 있으면 세션만들어줌


// 이 밑에 있는 코드를 실행하고 싶으면 
// passport.authenticate('local')() 쓰면 됨.
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username : 입력한아이디})
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' })
    }
    console.log(await bcrypt.compare(입력한비번, result.password))
    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result)
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  }))

// 밑에 내용은 요청.login() 실행할때마다 같이 실행됨.
// 세션 document에 들어갈 내용들을 보내줌.
passport.serializeUser((user, done) =>{
    process.nextTick(() => { // 내부 코드를 비동기적으로 처리해줌
        done(null, { id : user._id , username: user.username })
    })
})


// 밑에 내용은 마찬가지로 요청.login() 실행할때마다 같이 실행됨.
// 쿠키를 분석해주는 역할(입장권 확인 역할)
// 이 밑 코드가 있으면 아무대서나 요청.user 사용하면 로그인한 사용자의 정보를 보내줌. 
passport.deserializeUser(async (user, done) =>{
    let result = await db.collection('user').findOne({_id: new ObjectId(user.id)})
    delete result.password // 비번은 삭제
    process.nextTick(() => { // 내부 코드를 비동기적으로 처리해줌
        done(null, result) // result에 저장된 값이 요청.user에 들어감.
    })
})


app.get('/login', async(요청,응답)=>{

    응답.render('login.ejs')

})
app.get('/mypage', async(요청,응답)=>{

    
    if(요청.user == undefined){
        응답.render('login.ejs')
    }
    else{
        let result = await 요청.user.username
        응답.render('mypage.ejs', {posts : result})
    }
    

})

app.post('/login', async(요청,응답, next)=>{

    passport.authenticate('local', (error, user, info)=>{
        if(error) return 응답.status(500).json(error) // 에러에 뭐가 들어오면 에러500 보내줌.
        if(!user) return 응답.status(401).json(info.message) // DB에 있는거랑 비교해봤는데 맞지 않는 경우
        
        // 밑에꺼 실행되면 세션만들기가 실행됨.
        요청.logIn(user, (err)=>{
            if(err) return next(err)
            응답.redirect('/') // 로그인 완료시 실행할 코드
        })

    })(요청, 응답, next)

})

app.get('/register' , (요청, 응답)=>{
    응답.render('register.ejs')
})

app.post('/register' , async(요청, 응답)=>{

    let 해시 = await bcrypt.hash(요청.body.password, 10)
    // 기존의 비밀번호를 해싱을 해서 암호화 하는 작업.
    let result = await db.collection('user').findOne({ username : 요청.body.username })  

    if(요청.body.username == ''){
        console.log("아이디가 입력되지 않았습니다.")
    }
    else if(요청.body.password != 요청.body.password_check){
        console.log('비밀번호가 일치하지 않습니다. 다시 확인해주세요.')
    }
    else if(!result){
        await db.collection('user').insertOne({ 
            username : 요청.body.username,
            password : 해시 //해싱한 값을 비번에 저장.
        })
        응답.redirect('/')
    }
    else{
        console.log("이미 존재하는 아이디입니다. 다시 입력해주세요.")
    } 

})


app.get('/list', async(요청, 응답)=>{
    let result = await db.collection('post').find().toArray()// 컬렉션의 모든 document 출력 하는 법.
    응답.render('list.ejs', { posts : result })

    // 서버 데이터를 ejs 파일에 넣으려면
    // 1. ejs 파일로 데이터 전송
    // 2. ejs 파일 안에서 <%=데이터이름%>
})

app.get('/write', async(요청, 응답)=>{
    if(!요청.user?.username){
        console.log('로그인을 해야 게시글 작성이 가능합니다.')
    }
    else{
        응답.render('write.ejs')
    }
})















