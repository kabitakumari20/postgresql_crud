

const errorHandler = (err) => {
    let status = 500; // Default status code for internal server error
    let message = "Internal Server Error";


    if (err instanceof Error) {
        // Handle specific error types
        status = 400; // Bad Request
        message = err.message;
    }

    return { status, message };
};

exports.wrapAsync = fn => {
    return (req, res) => {
        return fn(req, res)
            .then(r => {
                if (r && r.render === "invoice") {
                    res.render("invoice", r.data);
                } else {
                    res.status(r.status || 200).send(r);
                }
            })
            .catch(err => {
                console.error(err);
                const response = errorHandler(err);
                res.status(response.status || 500).send(response);
            });
    };
};