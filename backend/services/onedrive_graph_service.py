import requests


class OneDriveGraphService:
    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"

    @staticmethod
    def get_user_profile(access_token):
        url = f"{OneDriveGraphService.GRAPH_BASE_URL}/me"
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(url, headers=headers, timeout=15)
        return response.json()

    @staticmethod
    def list_folders(access_token, max_depth=4, max_folders=500):
        headers = {"Authorization": f"Bearer {access_token}"}
        session = requests.Session()
        folders = []
        fields = "$select=id,name,folder&$top=200"

        def _fetch_page(url):
            r = session.get(url, headers=headers, timeout=20)
            if r.status_code != 200:
                return [], None
            d = r.json()
            return d.get("value", []), d.get("@odata.nextLink")

        def _list_children(parent_url, parent_path, depth):
            if depth > max_depth or len(folders) >= max_folders:
                return
            url = parent_url
            while url:
                items, next_link = _fetch_page(url)
                for item in items:
                    if "folder" not in item:
                        continue
                    name = item["name"]
                    path = f"{parent_path}/{name}" if parent_path else name
                    folders.append({"id": item["id"], "name": path})
                    if len(folders) >= max_folders:
                        return
                    if item.get("folder", {}).get("childCount", 0) > 0:
                        child_url = (
                            f"{OneDriveGraphService.GRAPH_BASE_URL}"
                            f"/me/drive/items/{item['id']}/children?{fields}"
                        )
                        _list_children(child_url, path, depth + 1)
                url = next_link

        root_url = f"{OneDriveGraphService.GRAPH_BASE_URL}/me/drive/root/children?{fields}"
        _list_children(root_url, "", 0)
        folders.sort(key=lambda f: f["name"].lower())
        return folders

    @staticmethod
    def list_files_in_folder(access_token, folder_id):
        url = f"{OneDriveGraphService.GRAPH_BASE_URL}/me/drive/items/{folder_id}/children?$top=200"
        headers = {"Authorization": f"Bearer {access_token}"}
        all_files = []
        while url:
            response = requests.get(url, headers=headers, timeout=20)
            data = response.json()
            all_files.extend(data.get("value", []))
            url = data.get("@odata.nextLink")
        return all_files

    @staticmethod
    def download_file(access_token, file_id):
        url = f"{OneDriveGraphService.GRAPH_BASE_URL}/me/drive/items/{file_id}/content"
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(url, headers=headers, timeout=60)
        response.raise_for_status()
        return response.content
