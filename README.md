# To set up the index the first time

```
node index.js --auth <pinboard_username>:<pinboard_api_auth_token> --index http://<elasticsearch_host>/<elasticsearch_index_name> --init
```

# To update the records by fetching the last 25
```
node index.js --auth <pinboard_username>:<pinboard_api_auth_token> --index http://<elasticsearch_host>/<elasticsearch_index_name> --update
```
