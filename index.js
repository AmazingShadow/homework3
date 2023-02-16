const express = require('express')
const expressHandlebars = require('express-handlebars')
const multiparty = require('multiparty');
const credentials = require("./credentials.js")
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express()
const port = 3000
const rootFolder = path.join(__dirname, 'public')

// Convert data.
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(require('cookie-parser')(credentials.cookieSecret))

app.engine('hbs', expressHandlebars.engine({
    defaultLayout: 'main',
    extname: '.hbs',
}))
app.set('view engine', 'hbs');

app.get('/upload', (req, res) => {
    fs.readdir(rootFolder, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Lỗi đọc danh sách thư mục');
        }

        // Lọc các thư mục từ danh sách files
        const folders = files.filter(file => {
            return fs.statSync(path.join(rootFolder, file)).isDirectory();
        });

        // Hiển thị danh sách các thư mục trên trang chủ
        res.render('upload', {folders})
    });
})

app.post('/upload', (req, res) => {
    const forms = new multiparty.Form();
    forms.parse(req, (err, fields, files) => {
        let option = fields.option[0]
        if (err) {
            return res.status(500).send({ error: err.message });
        }

        const photo = files.photo;
        if (!photo) {
            return res.status(400).send({ error: 'No photo file found' });
        }

        const promises = photo.map((file) => {
            return new Promise((resolve, reject) => {
                const oldPath = file.path;
                const newPath = `${rootFolder}/${option}/${file.originalFilename}`;

                fs.copyFile(oldPath, newPath, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                console.log('Successfully copied all files');
                res.redirect('/');
            })
            .catch((err) => {
                console.error(err);
                res.status(500).send({ error: err.message });
            });
    });
});

app.get('/', (req, res) => {
    // Đọc danh sách các thư mục con
    fs.readdir(rootFolder, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Lỗi đọc danh sách thư mục');
        }

        // Lọc các thư mục từ danh sách files
        const folders = files.filter(file => {
            return fs.statSync(path.join(rootFolder, file)).isDirectory();
        });

        // Hiển thị danh sách các thư mục trên trang chủ
        let html = `<h1>Danh sách các thư mục:</h1>
                    ${folders.map(folder => `<tr><td><p class="folder">${folder}</p></td></tr>`).join('')}
                    `
        res.render('home', { html });
    });
});

app.get('/:folderName', (req, res) => {
    const folderPath = path.join(rootFolder, req.params.folderName);
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Lỗi đọc danh sách file' });
        }

        // Lọc các file hình ảnh từ danh sách files
        const images = files.filter(file => {
            return /\.(jpg|jpeg|png|gif)$/i.test(file);
        });

        // Trả về danh sách các hình ảnh dưới dạng JSON
        res.json(images);
    });
});


app.listen(port, () => console.log(
    `Express started on http://localhost:${port}; ` +
    'press Ctrl-C to terminate. '))